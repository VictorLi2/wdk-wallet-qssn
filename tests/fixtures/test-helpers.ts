/**
 * Helper utilities for integration tests
 */

import { ethers, NonceManager } from "ethers";
import { TEST_CONFIG, TEST_FUNDER_PRIVATE_KEY } from "./test-config.js";

// Singleton NonceManager for the funder wallet
// This ensures all tests share the same nonce tracking
let sharedFunderNonceManager: NonceManager | null = null;
let sharedProvider: ethers.JsonRpcProvider | null = null;

/**
 * Get the shared funder wallet wrapped with NonceManager.
 * Uses a singleton pattern to ensure consistent nonce tracking across all tests.
 * The NonceManager queries the chain for fresh nonces, avoiding "nonce too low" errors.
 */
export function getFunderWallet(provider?: ethers.Provider): NonceManager {
	// If no singleton yet, create one
	if (!sharedFunderNonceManager) {
		sharedProvider = new ethers.JsonRpcProvider(TEST_CONFIG.rpcUrl);
		const wallet = new ethers.Wallet(TEST_FUNDER_PRIVATE_KEY, sharedProvider);
		sharedFunderNonceManager = new NonceManager(wallet);
	}
	return sharedFunderNonceManager;
}

/**
 * Reset the shared NonceManager (useful between test runs if needed)
 */
export function resetFunderNonceManager(): void {
	if (sharedFunderNonceManager) {
		sharedFunderNonceManager.reset();
	}
}

/**
 * Fund a wallet with ETH for testing
 * Uses the shared NonceManager for automatic nonce handling
 */
export async function fundWallet(address: string, amount: string, provider?: ethers.Provider): Promise<void> {
	const funder = getFunderWallet();

	const tx = await funder.sendTransaction({
		to: address,
		value: ethers.parseEther(amount),
	});

	await tx.wait();
}

/**
 * Get the current balance of an address
 */
export async function getBalance(address: string, provider?: ethers.Provider): Promise<bigint> {
	const testProvider = provider || new ethers.JsonRpcProvider(TEST_CONFIG.rpcUrl);
	return await testProvider.getBalance(address);
}

/**
 * Check if a contract is deployed at an address
 */
export async function isContractDeployed(address: string, provider?: ethers.Provider): Promise<boolean> {
	const testProvider = provider || new ethers.JsonRpcProvider(TEST_CONFIG.rpcUrl);
	const code = await testProvider.getCode(address);
	return code !== "0x";
}

/**
 * Wait for a condition to be true
 */
export async function waitForCondition(
	condition: () => Promise<boolean>,
	timeout = 10000,
	interval = 500,
): Promise<void> {
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		if (await condition()) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, interval));
	}

	throw new Error("Timeout waiting for condition");
}
