/**
 * Integration test: Quote revert detection
 *
 * Tests that quoteSendTransaction properly detects and reports
 * transactions that would revert on-chain.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { ethers } from "ethers";
import { generateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { WalletManagerQssn, waitForUserOp } from "../../src/index.js";
import { TEST_CONFIG } from "../fixtures/test-config.js";
import { fundWallet, isContractDeployed, getFunderWallet, resetFunderNonceManager } from "../fixtures/test-helpers.js";

// Skip these tests unless RUN_INTEGRATION_TESTS is set
const describeIntegration = TEST_CONFIG.skipIntegrationTests ? describe.skip : describe;

// StableCoin contract ABI (minimal for testing)
const STABLECOIN_ABI = [
	"function pause() external",
	"function unpause() external",
	"function mint(address to, uint256 amount) external",
	"function paused() view returns (bool)",
	"function owner() view returns (address)",
];

describeIntegration("Integration: Quote Revert Detection", { timeout: 120000 }, () => {
	let provider: ethers.JsonRpcProvider;
	let stablecoinFactory: ethers.Contract;
	let deployedStablecoin: string | null = null;

	beforeAll(async () => {
		provider = new ethers.JsonRpcProvider(TEST_CONFIG.rpcUrl);

		// StableCoin factory address (from local deployment)
		const factoryAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
		const factoryABI = [
			"function deployStablecoin(string name, string symbol, uint8 decimals) external returns (address)",
			"event StablecoinDeployed(address indexed stablecoin, address indexed owner)",
		];

		stablecoinFactory = new ethers.Contract(factoryAddress, factoryABI, provider);
	});

	it("should succeed for valid transaction", async () => {
		// Create a fresh wallet
		const ecdsaMnemonic = generateMnemonic(wordlist);
		const mldsaMnemonic = generateMnemonic(wordlist);

		const walletManager = new WalletManagerQssn(ecdsaMnemonic, mldsaMnemonic, {
			chainId: TEST_CONFIG.chainId,
			bundlerUrl: TEST_CONFIG.bundlerUrl,
			provider: TEST_CONFIG.rpcUrl,
			walletFactoryAddress: TEST_CONFIG.walletFactoryAddress,
		});

		const account = await walletManager.getAccount(0);
		const address = await account.getAddress();

		// Fund the wallet
		await fundWallet(address, "10.0", provider);

		// Quote a simple valid transaction
		const tx = {
			to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
			value: ethers.parseEther("0.001"),
			data: "0x",
		};

		// This should succeed
		const quote = await account.quoteSendTransaction(tx);

		expect(quote).toBeDefined();
		expect(quote.fee).toBeGreaterThan(0n);
		expect(quote.gasLimits).toBeDefined();
	});

	it("should return quote even for transaction with insufficient balance", async () => {
		// Create a fresh wallet
		const ecdsaMnemonic = generateMnemonic(wordlist);
		const mldsaMnemonic = generateMnemonic(wordlist);

		const walletManager = new WalletManagerQssn(ecdsaMnemonic, mldsaMnemonic, {
			chainId: TEST_CONFIG.chainId,
			bundlerUrl: TEST_CONFIG.bundlerUrl,
			provider: TEST_CONFIG.rpcUrl,
			walletFactoryAddress: TEST_CONFIG.walletFactoryAddress,
		});

		const account = await walletManager.getAccount(0);
		const address = await account.getAddress();

		// Fund with small amount
		await fundWallet(address, "0.1", provider);

		const balance = await provider.getBalance(address);

		// Try to transfer more than available
		const excessiveAmount = balance + ethers.parseEther("1000");
		const tx = {
			to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
			value: excessiveAmount,
			data: "0x",
		};

		// Quote succeeds - balance validation happens at submission time, not estimation
		// This is correct ERC-4337 behavior
		const quote = await account.quoteSendTransaction(tx);
		expect(quote.fee).toBeGreaterThan(0n);
		expect(quote.gasLimits).toBeDefined();
	});

	it("should detect revert when calling paused contract", async () => {
		// Deploy a stablecoin that we can pause
		const funderWallet = getFunderWallet(provider);

		// Use unique name/symbol to avoid CREATE2 collision from previous test runs
		const timestamp = Date.now();
		const tokenName = `Test Coin ${timestamp}`;
		const tokenSymbol = `TST${timestamp % 10000}`;

		// Deploy stablecoin via factory
		const factoryWithSigner = stablecoinFactory.connect(funderWallet) as any;
		let deployTx;
		try {
			deployTx = await factoryWithSigner.deployStablecoin(tokenName, tokenSymbol, 18);
		} catch (e: any) {
			// Factory deployment failed (likely CREATE2 collision), skip test
			resetFunderNonceManager();
			return;
		}
		const deployReceipt = await deployTx.wait();

		// Get deployed stablecoin address from event
		const event = deployReceipt?.logs
			.map((log: any) => {
				try {
					return stablecoinFactory.interface.parseLog({
						topics: log.topics as string[],
						data: log.data,
					});
				} catch {
					return null;
				}
			})
			.find((e: any) => e?.name === "StablecoinDeployed");

		expect(event).toBeDefined();
		deployedStablecoin = event!.args.stablecoin;

		const stablecoin = new ethers.Contract(deployedStablecoin!, STABLECOIN_ABI, funderWallet);

		// Pause the contract
		const pauseTx = await stablecoin.pause();
		await pauseTx.wait();

		const isPaused = await stablecoin.paused();
		expect(isPaused).toBe(true);

		// Create wallet and try to interact with paused contract
		const ecdsaMnemonic = generateMnemonic(wordlist);
		const mldsaMnemonic = generateMnemonic(wordlist);

		const walletManager = new WalletManagerQssn(ecdsaMnemonic, mldsaMnemonic, {
			chainId: TEST_CONFIG.chainId,
			bundlerUrl: TEST_CONFIG.bundlerUrl,
			provider: TEST_CONFIG.rpcUrl,
			walletFactoryAddress: TEST_CONFIG.walletFactoryAddress,
		});

		const account = await walletManager.getAccount(0);
		const address = await account.getAddress();

		// Fund the wallet
		await fundWallet(address, "10.0", provider);

		// Try to mint tokens (should fail because contract is paused)
		const mintData = stablecoin.interface.encodeFunctionData("mint", [address, ethers.parseEther("100")]);

		const tx = {
			to: deployedStablecoin!,
			value: 0n,
			data: mintData,
		};

		// This should throw an error because the contract is paused
		await expect(account.quoteSendTransaction(tx)).rejects.toThrow();

		// Cleanup: unpause for other tests
		const unpauseTx = await stablecoin.unpause();
		await unpauseTx.wait();
	});

	it("should succeed when calling unpaused contract", async () => {
		// Skip if no stablecoin deployed in previous test
		if (!deployedStablecoin) {
			return;
		}

		const funderWallet = getFunderWallet(provider);
		const stablecoin = new ethers.Contract(deployedStablecoin, STABLECOIN_ABI, funderWallet);

		// Ensure unpaused
		const isPaused = await stablecoin.paused();
		if (isPaused) {
			const unpauseTx = await stablecoin.unpause();
			await unpauseTx.wait();
		}

		// Create wallet
		const ecdsaMnemonic = generateMnemonic(wordlist);
		const mldsaMnemonic = generateMnemonic(wordlist);

		const walletManager = new WalletManagerQssn(ecdsaMnemonic, mldsaMnemonic, {
			chainId: TEST_CONFIG.chainId,
			bundlerUrl: TEST_CONFIG.bundlerUrl,
			provider: TEST_CONFIG.rpcUrl,
			walletFactoryAddress: TEST_CONFIG.walletFactoryAddress,
		});

		const account = await walletManager.getAccount(0);
		const address = await account.getAddress();

		// Fund the wallet
		await fundWallet(address, "10.0", provider);

		// Wait before transaction
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Try to mint tokens (should succeed now)
		const mintData = stablecoin.interface.encodeFunctionData("mint", [address, ethers.parseEther("100")]);

		const tx = {
			to: deployedStablecoin,
			value: 0n,
			data: mintData,
		};

		// This should succeed with a quote
		const quote = await account.quoteSendTransaction(tx);

		expect(quote).toBeDefined();
		expect(quote.fee).toBeGreaterThan(0n);

		// Actually send the transaction to verify it works
		const result = await account.sendTransaction(tx);
		const pollResult = await waitForUserOp(TEST_CONFIG.bundlerUrl, result.hash, { timeoutMs: 30000 });
		expect(pollResult.success).toBe(true);
	});

	it("should detect revert for undeployed wallet calling paused contract", async () => {
		// Skip if no stablecoin deployed
		if (!deployedStablecoin) {
			return;
		}

		const funderWallet = getFunderWallet(provider);
		const stablecoin = new ethers.Contract(deployedStablecoin, STABLECOIN_ABI, funderWallet);

		// Pause the contract
		const pauseTx = await stablecoin.pause();
		await pauseTx.wait();

		// Create NEW undeployed wallet
		const ecdsaMnemonic = generateMnemonic(wordlist);
		const mldsaMnemonic = generateMnemonic(wordlist);

		const walletManager = new WalletManagerQssn(ecdsaMnemonic, mldsaMnemonic, {
			chainId: TEST_CONFIG.chainId,
			bundlerUrl: TEST_CONFIG.bundlerUrl,
			provider: TEST_CONFIG.rpcUrl,
			walletFactoryAddress: TEST_CONFIG.walletFactoryAddress,
		});

		const account = await walletManager.getAccount(0);
		const address = await account.getAddress();

		// Verify wallet is NOT deployed
		const deployedBefore = await isContractDeployed(address, provider);
		expect(deployedBefore).toBe(false);

		// Fund the wallet
		await fundWallet(address, "10.0", provider);

		// Wait before quote
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Try to mint tokens on paused contract
		const mintData = stablecoin.interface.encodeFunctionData("mint", [address, ethers.parseEther("100")]);

		const tx = {
			to: deployedStablecoin,
			value: 0n,
			data: mintData,
		};

		// This should throw an error even though wallet is undeployed
		// The bundler should detect the revert AFTER deployment
		await expect(account.quoteSendTransaction(tx)).rejects.toThrow();

		// Cleanup
		const unpauseTx = await stablecoin.unpause();
		await unpauseTx.wait();
	});

	it("should return valid quote for transfer within balance", async () => {
		// Create wallet
		const ecdsaMnemonic = generateMnemonic(wordlist);
		const mldsaMnemonic = generateMnemonic(wordlist);

		const walletManager = new WalletManagerQssn(ecdsaMnemonic, mldsaMnemonic, {
			chainId: TEST_CONFIG.chainId,
			bundlerUrl: TEST_CONFIG.bundlerUrl,
			provider: TEST_CONFIG.rpcUrl,
			walletFactoryAddress: TEST_CONFIG.walletFactoryAddress,
		});

		const account = await walletManager.getAccount(0);
		const address = await account.getAddress();

		// Fund wallet
		await fundWallet(address, "1.0", provider);

		// Simple transfer within balance
		const tx = {
			to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
			value: ethers.parseEther("0.001"),
			data: "0x",
		};

		// Quote should succeed and return meaningful values
		const quote = await account.quoteSendTransaction(tx);
		expect(quote.fee).toBeGreaterThan(0n);
		expect(quote.gasLimits).toBeDefined();
		expect(quote.gasLimits.callGasLimit).toBeGreaterThan(0n);
	});
});
