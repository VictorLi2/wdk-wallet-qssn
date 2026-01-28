/**
 * Integration test: Bundler interaction with operator rotation
 *
 * Tests quantum-safe wallet with bundler v2 including operator rotation.
 * Requires a running local node and bundler.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { ethers } from "ethers";
import { generateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { WalletManagerQssn, waitForUserOp } from "../../src/index.js";
import { TEST_CONFIG, TEST_FUNDER_PRIVATE_KEY } from "../fixtures/test-config.js";
import { fundWallet, isContractDeployed, waitForCondition } from "../fixtures/test-helpers.js";

// Skip these tests unless RUN_INTEGRATION_TESTS is set
const describeIntegration = TEST_CONFIG.skipIntegrationTests ? describe.skip : describe;

const OPERATOR_MANAGER_ABI = [
	"function operator() view returns (address)",
	"function usedOperators(address) view returns (bool)",
];

describeIntegration("Integration: Bundler with Operator Rotation", { timeout: 60000 }, () => {
	let provider: ethers.JsonRpcProvider;
	let operatorManager: ethers.Contract;

	beforeAll(() => {
		provider = new ethers.JsonRpcProvider(TEST_CONFIG.rpcUrl);
		operatorManager = new ethers.Contract(TEST_CONFIG.operatorManagerAddress, OPERATOR_MANAGER_ABI, provider);
	});

	it("should send transaction through bundler", async () => {
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

		// Send transaction
		const tx = {
			to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
			value: ethers.parseEther("0.001"),
			data: "0x",
		};

		const result = await account.sendTransaction(tx);

		expect(result).toBeDefined();
		expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);

		// Wait for transaction
		const pollResult = await waitForUserOp(TEST_CONFIG.bundlerUrl, result.hash, { timeoutMs: 30000 });
		expect(pollResult.success).toBe(true);
		expect(pollResult.txHash).toBeTruthy();

		// Verify wallet is deployed
		const walletAddress = await account.getAddress();
		const deployed = await isContractDeployed(walletAddress, provider);
		expect(deployed).toBe(true);
	});

	it("should verify operator rotation after transaction", async () => {
		// Get operator before transaction
		const operatorBefore = await operatorManager.operator();

		// Create a fresh wallet
		const ecdsaMnemonic = generateMnemonic(wordlist);
		const mldsaMnemonic = generateMnemonic(wordlist);

		const walletManager = new WalletManagerQssn(ecdsaMnemonic, mldsaMnemonic, {
			chainId: TEST_CONFIG.chainId,
			bundlerUrl: TEST_CONFIG.bundlerUrl,
			provider: TEST_CONFIG.rpcUrl,
		});

		const account = await walletManager.getAccount(0);

		// Fund and send transaction
		const walletAddress = await account.getAddress();
		await fundWallet(walletAddress, TEST_CONFIG.fundingAmount, provider);

		const tx = {
			to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
			value: ethers.parseEther("0.001"),
			data: "0x",
		};

		const result = await account.sendTransaction(tx);
		const pollResult = await waitForUserOp(TEST_CONFIG.bundlerUrl, result.hash, { timeoutMs: 30000 });
		expect(pollResult.success).toBe(true);

		// Check operator after transaction
		const operatorAfter = await operatorManager.operator();

		// Operator should be tracked (either same or rotated depending on state)
		expect(operatorAfter).toMatch(/^0x[a-fA-F0-9]{40}$/);

		// If rotated, old operator should be marked as used
		if (operatorAfter.toLowerCase() !== operatorBefore.toLowerCase()) {
			const oldOperatorUsed = await operatorManager.usedOperators(operatorBefore);
			expect(oldOperatorUsed).toBe(true);
		}
	});

	it(
		"should handle multiple transactions from same wallet",
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

			// Fund with enough for multiple transactions
			await fundWallet(address, "2.0", provider);

			const initialBalance = await provider.getBalance(address);

			// Send first transaction
			const tx1 = {
				to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
				value: ethers.parseEther("0.001"),
				data: "0x",
			};

			const result1 = await account.sendTransaction(tx1);
			const pollResult1 = await waitForUserOp(TEST_CONFIG.bundlerUrl, result1.hash, { timeoutMs: 40000 });
			expect(pollResult1.success).toBe(true);

			// Wait a bit before sending second transaction to avoid nonce issues
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Send second transaction
			const tx2 = {
				to: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
				value: ethers.parseEther("0.001"),
				data: "0x",
			};

			const result2 = await account.sendTransaction(tx2);
			const pollResult2 = await waitForUserOp(TEST_CONFIG.bundlerUrl, result2.hash, { timeoutMs: 40000 });
			expect(pollResult2.success).toBe(true);

			// Verify balance decreased
			const finalBalance = await provider.getBalance(address);
			expect(finalBalance).toBeLessThan(initialBalance);

			// Both transactions should have different hashes
			expect(result1.hash).not.toBe(result2.hash);
		},
		{ timeout: 120000 },
	); // 2 minutes for multiple transactions

	it("should get transaction receipt after confirmation", async () => {
		// Create a fresh wallet
		const ecdsaMnemonic = generateMnemonic(wordlist);
		const mldsaMnemonic = generateMnemonic(wordlist);

		const walletManager = new WalletManagerQssn(ecdsaMnemonic, mldsaMnemonic, {
			chainId: TEST_CONFIG.chainId,
			bundlerUrl: TEST_CONFIG.bundlerUrl,
			provider: TEST_CONFIG.rpcUrl,
		});

		const account = await walletManager.getAccount(0);

		// Fund and send transaction
		const walletAddress = await account.getAddress();
		await fundWallet(walletAddress, TEST_CONFIG.fundingAmount, provider);

		const tx = {
			to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
			value: ethers.parseEther("0.001"),
			data: "0x",
		};

		const result = await account.sendTransaction(tx);
		const pollResult = await waitForUserOp(TEST_CONFIG.bundlerUrl, result.hash, { timeoutMs: 30000 });
		expect(pollResult.success).toBe(true);
		expect(pollResult.txHash).toBeTruthy();

		// Get receipt using the userOpHash (not the txHash)
		// getTransactionReceipt calls eth_getUserOperationReceipt which needs the userOpHash
		const receipt = await account.getTransactionReceipt(result.hash);

		expect(receipt).toBeDefined();
		expect(receipt).not.toBeNull();
		if (receipt) {
			// Receipt values come as hex strings from eth_getUserOperationReceipt
			expect(BigInt(receipt.blockNumber)).toBeGreaterThan(0n);
			expect(BigInt(receipt.gasUsed)).toBeGreaterThan(0n);
			// Status is "success" for successful transactions
			expect(receipt.status).toBe("success");
		}
	});
});
