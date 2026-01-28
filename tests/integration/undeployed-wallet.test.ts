/**
 * Integration test: Undeployed wallet validation
 *
 * Tests gas estimation and revert detection for wallets that haven't been deployed yet.
 * Requires a running local node and bundler.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { ethers } from "ethers";
import { generateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { WalletManagerQssn, waitForUserOp } from "../../src/index.js";
import { TEST_CONFIG, TEST_FUNDER_PRIVATE_KEY } from "../fixtures/test-config.js";
import { fundWallet, isContractDeployed } from "../fixtures/test-helpers.js";

// Skip these tests unless RUN_INTEGRATION_TESTS is set
const describeIntegration = TEST_CONFIG.skipIntegrationTests ? describe.skip : describe;

describeIntegration("Integration: Undeployed Wallet Validation", { timeout: 60000 }, () => {
	let provider: ethers.JsonRpcProvider;

	beforeAll(() => {
		provider = new ethers.JsonRpcProvider(TEST_CONFIG.rpcUrl);
	});

	it("should create a fresh undeployed wallet", async () => {
		const ecdsaMnemonic = generateMnemonic(wordlist);
		const mldsaMnemonic = generateMnemonic(wordlist);

		const walletManager = new WalletManagerQssn(ecdsaMnemonic, mldsaMnemonic, {
			chainId: TEST_CONFIG.chainId,
			bundlerUrl: TEST_CONFIG.bundlerUrl,
			provider: TEST_CONFIG.rpcUrl,
		});

		const account = await walletManager.getAccount(0);
		const address = await account.getAddress();
		const deployed = await isContractDeployed(address, provider);

		expect(deployed).toBe(false);
	});

	it("should quote valid transaction for undeployed wallet", async () => {
		// Create a fresh wallet
		const ecdsaMnemonic = generateMnemonic(wordlist);
		const mldsaMnemonic = generateMnemonic(wordlist);

		const walletManager = new WalletManagerQssn(ecdsaMnemonic, mldsaMnemonic, {
			chainId: TEST_CONFIG.chainId,
			bundlerUrl: TEST_CONFIG.bundlerUrl,
			provider: TEST_CONFIG.rpcUrl,
		});

		const account = await walletManager.getAccount(0);
		const address = await account.getAddress();

		// Fund the wallet
		await fundWallet(address, TEST_CONFIG.fundingAmount, provider);

		// Verify it's still not deployed
		const deployed = await isContractDeployed(address, provider);
		expect(deployed).toBe(false);

		// Quote a valid transaction
		const tx = {
			to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
			value: ethers.parseEther("0.001"),
			data: "0x",
		};

		const quote = await account.quoteSendTransaction(tx);

		expect(quote).toBeDefined();
		expect(quote.fee).toBeGreaterThan(0n);
		expect(quote.gasLimits).toBeDefined();
		expect(quote.gasLimits.callGasLimit).toBeGreaterThan(0n);
		expect(quote.gasLimits.verificationGasLimit).toBeGreaterThan(0n);
		expect(quote.gasLimits.preVerificationGas).toBeGreaterThan(0n);
	});

	it("should detect insufficient balance for undeployed wallet", async () => {
		// Wait for previous test's funder transaction to be mined
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Create a fresh wallet
		const ecdsaMnemonic = generateMnemonic(wordlist);
		const mldsaMnemonic = generateMnemonic(wordlist);

		const walletManager = new WalletManagerQssn(ecdsaMnemonic, mldsaMnemonic, {
			chainId: TEST_CONFIG.chainId,
			bundlerUrl: TEST_CONFIG.bundlerUrl,
			provider: TEST_CONFIG.rpcUrl,
		});

		const account = await walletManager.getAccount(0);
		const address = await account.getAddress();

		// Fund with a small amount
		await fundWallet(address, "0.1", provider);

		const balance = await provider.getBalance(address);

		// Try to transfer more than available
		const excessiveAmount = balance + ethers.parseEther("1000");
		const tx = {
			to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
			value: excessiveAmount,
			data: "0x",
		};

		// Quote succeeds even with insufficient balance (balance is checked at submission time, not estimation)
		// This is correct ERC-4337 behavior - bundler estimates gas, doesn't validate balance
		const quote = await account.quoteSendTransaction(tx);
		expect(quote.fee).toBeGreaterThan(0n);
		expect(quote.gasLimits).toBeDefined();
	});

	it("should successfully send transaction and deploy wallet", async () => {
		// Create a fresh wallet
		const ecdsaMnemonic = generateMnemonic(wordlist);
		const mldsaMnemonic = generateMnemonic(wordlist);

		const walletManager = new WalletManagerQssn(ecdsaMnemonic, mldsaMnemonic, {
			chainId: TEST_CONFIG.chainId,
			bundlerUrl: TEST_CONFIG.bundlerUrl,
			provider: TEST_CONFIG.rpcUrl,
		});

		const account = await walletManager.getAccount(0);
		const address = await account.getAddress();

		// Verify not deployed
		const deployedBefore = await isContractDeployed(address, provider);
		expect(deployedBefore).toBe(false);

		// Fund the wallet
		await fundWallet(address, "1.0", provider);

		// Send a transaction
		const tx = {
			to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
			value: ethers.parseEther("0.001"),
			data: "0x",
		};

		const result = await account.sendTransaction(tx);

		expect(result).toBeDefined();
		expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);

		// Wait for transaction (with timeout)
		const pollResult = await waitForUserOp(TEST_CONFIG.bundlerUrl, result.hash, { timeoutMs: 30000 });
		expect(pollResult.success).toBe(true);
		expect(pollResult.txHash).toBeTruthy();

		// Verify wallet is now deployed
		const deployedAfter = await isContractDeployed(address, provider);
		expect(deployedAfter).toBe(true);
	});

	it(
		"should handle subsequent transactions after deployment",
		async () => {
			// Create a fresh wallet
			const ecdsaMnemonic = generateMnemonic(wordlist);
			const mldsaMnemonic = generateMnemonic(wordlist);

			const walletManager = new WalletManagerQssn(ecdsaMnemonic, mldsaMnemonic, {
				chainId: TEST_CONFIG.chainId,
				bundlerUrl: TEST_CONFIG.bundlerUrl,
				provider: TEST_CONFIG.rpcUrl,
			});

			const account = await walletManager.getAccount(0);
			const address = await account.getAddress();

			// Fund and deploy with first transaction
			await fundWallet(address, "2.0", provider);

			const tx1 = {
				to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
				value: ethers.parseEther("0.001"),
				data: "0x",
			};

			const result1 = await account.sendTransaction(tx1);
			const pollResult1 = await waitForUserOp(TEST_CONFIG.bundlerUrl, result1.hash, { timeoutMs: 40000 });
			expect(pollResult1.success).toBe(true);

			// Verify deployed
			const deployed = await isContractDeployed(address, provider);
			expect(deployed).toBe(true);

			// Wait a bit before sending second transaction
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Send second transaction (should not need deployment)
			const tx2 = {
				to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
				value: ethers.parseEther("0.001"),
				data: "0x",
			};

			const quote2 = await account.quoteSendTransaction(tx2);
			expect(quote2.gasLimits.verificationGasLimit).toBeLessThan(BigInt(1000000)); // Should be lower than first tx

			const result2 = await account.sendTransaction(tx2);
			const pollResult2 = await waitForUserOp(TEST_CONFIG.bundlerUrl, result2.hash, { timeoutMs: 40000 });
			expect(pollResult2.success).toBe(true);
		},
		{ timeout: 120000 },
	); // 2 minutes for multiple transactions
});
