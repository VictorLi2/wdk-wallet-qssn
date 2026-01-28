/**
 * Integration test: Gas estimation accuracy
 *
 * Tests that quoteSendTransaction provides accurate gas estimates
 * by comparing quoted gas vs actual gas used on-chain.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { ethers } from "ethers";
import { generateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { WalletManagerQssn, waitForUserOp } from "../../src/index.js";
import { TEST_CONFIG } from "../fixtures/test-config.js";
import { fundWallet, isContractDeployed } from "../fixtures/test-helpers.js";

// Skip these tests unless RUN_INTEGRATION_TESTS is set
const describeIntegration = TEST_CONFIG.skipIntegrationTests ? describe.skip : describe;

describeIntegration("Integration: Gas Estimation Accuracy", { timeout: 120000 }, () => {
	let provider: ethers.JsonRpcProvider;

	beforeAll(() => {
		provider = new ethers.JsonRpcProvider(TEST_CONFIG.rpcUrl);
	});

	it("should provide accurate gas estimate for first transaction (wallet deployment)", async () => {
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

		// Verify wallet is NOT deployed
		const deployedBefore = await isContractDeployed(address, provider);
		expect(deployedBefore).toBe(false);

		// Fund the wallet
		await fundWallet(address, "10.0", provider);

		const tx = {
			to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
			value: ethers.parseEther("0.001"),
			data: "0x",
		};

		// Get quote
		const quote = await account.quoteSendTransaction(tx);
		const quotedFee = quote.fee;

		// Send transaction
		const result = await account.sendTransaction(tx);
		const pollResult = await waitForUserOp(TEST_CONFIG.bundlerUrl, result.hash, { timeoutMs: 30000 });
		expect(pollResult.success).toBe(true);
		expect(pollResult.txHash).toBeTruthy();

		// Get actual gas used from receipt
		const receipt = await provider.getTransactionReceipt(pollResult.txHash!);
		expect(receipt).toBeTruthy();

		const actualGasUsed = receipt!.gasUsed;
		const gasPrice = receipt!.gasPrice || 0n;
		const actualFee = actualGasUsed * gasPrice;

		// Calculate accuracy (quoted should be >= actual, typically within 20% overhead)
		const difference = quotedFee > actualFee ? quotedFee - actualFee : actualFee - quotedFee;
		const percentDiff = Number((difference * 10000n) / actualFee) / 100;

		// Quoted fee should cover actual fee
		expect(quotedFee).toBeGreaterThanOrEqual(actualFee);

		// Should be reasonably close (within 60% for deployment which has variable gas)
		// Bundler intentionally overestimates for safety margin
		expect(percentDiff).toBeLessThan(60);
	});

	it("should provide accurate gas estimate for second transaction (no deployment)", async () => {
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

		// Fund and deploy with first transaction
		await fundWallet(address, "10.0", provider);

		const tx1 = {
			to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
			value: ethers.parseEther("0.001"),
			data: "0x",
		};

		const result1 = await account.sendTransaction(tx1);
		const pollResult1 = await waitForUserOp(TEST_CONFIG.bundlerUrl, result1.hash, { timeoutMs: 30000 });
		expect(pollResult1.success).toBe(true);

		// Verify deployed
		const deployed = await isContractDeployed(address, provider);
		expect(deployed).toBe(true);

		// Wait before second transaction
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Now test gas accuracy for second transaction
		const tx2 = {
			to: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
			value: ethers.parseEther("0.001"),
			data: "0x",
		};

		// Get quote
		const quote = await account.quoteSendTransaction(tx2);
		const quotedFee = quote.fee;

		// Send transaction
		const result2 = await account.sendTransaction(tx2);
		const pollResult2 = await waitForUserOp(TEST_CONFIG.bundlerUrl, result2.hash, { timeoutMs: 30000 });
		expect(pollResult2.success).toBe(true);
		expect(pollResult2.txHash).toBeTruthy();

		// Get actual gas used from receipt
		const receipt = await provider.getTransactionReceipt(pollResult2.txHash!);
		expect(receipt).toBeTruthy();

		const actualGasUsed = receipt!.gasUsed;
		const gasPrice = receipt!.gasPrice || 0n;
		const actualFee = actualGasUsed * gasPrice;

		// Calculate accuracy
		const difference = quotedFee > actualFee ? quotedFee - actualFee : actualFee - quotedFee;
		const percentDiff = Number((difference * 10000n) / actualFee) / 100;

		// Quoted fee should cover actual fee (bundler intentionally overestimates for safety)
		expect(quotedFee).toBeGreaterThanOrEqual(actualFee);

		// Bundler overestimates for safety margin - allow up to 100% difference
		// The important thing is that quote >= actual (user won't run out of gas)
		expect(percentDiff).toBeLessThan(100);
	});

	it("should provide consistent quotes for identical transactions", async () => {
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

		const tx = {
			to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
			value: ethers.parseEther("0.001"),
			data: "0x",
		};

		// Get multiple quotes for the same transaction
		const quote1 = await account.quoteSendTransaction(tx);
		const quote2 = await account.quoteSendTransaction(tx);
		const quote3 = await account.quoteSendTransaction(tx);

		// Quotes should be very similar (gas prices may fluctuate slightly)
		// Check gas limits are identical
		expect(quote1.gasLimits.callGasLimit).toBe(quote2.gasLimits.callGasLimit);
		expect(quote2.gasLimits.callGasLimit).toBe(quote3.gasLimits.callGasLimit);

		expect(quote1.gasLimits.verificationGasLimit).toBe(quote2.gasLimits.verificationGasLimit);
		expect(quote2.gasLimits.verificationGasLimit).toBe(quote3.gasLimits.verificationGasLimit);

		expect(quote1.gasLimits.preVerificationGas).toBe(quote2.gasLimits.preVerificationGas);
		expect(quote2.gasLimits.preVerificationGas).toBe(quote3.gasLimits.preVerificationGas);
	});

	it("should estimate higher gas for first transaction than second", async () => {
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

		const tx = {
			to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
			value: ethers.parseEther("0.001"),
			data: "0x",
		};

		// Get quote for first transaction (includes deployment)
		const quote1 = await account.quoteSendTransaction(tx);
		const fee1 = quote1.fee;

		// Send first transaction
		const result1 = await account.sendTransaction(tx);
		const pollResult1 = await waitForUserOp(TEST_CONFIG.bundlerUrl, result1.hash, { timeoutMs: 30000 });
		expect(pollResult1.success).toBe(true);

		// Wait before second transaction
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Get quote for second transaction (no deployment)
		const quote2 = await account.quoteSendTransaction(tx);
		const fee2 = quote2.fee;

		// First transaction should cost significantly more due to deployment
		expect(fee1).toBeGreaterThan(fee2);

		const deploymentOverhead = fee1 - fee2;

		// Deployment should add substantial cost (at least 50% more)
		const overheadPercent = Number((deploymentOverhead * 100n) / fee2);
		expect(overheadPercent).toBeGreaterThan(50);
	});
});
