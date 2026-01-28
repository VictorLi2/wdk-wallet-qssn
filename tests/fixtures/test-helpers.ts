/**
 * Helper utilities for integration tests
 */

import { ethers } from "ethers";
import { TEST_CONFIG, TEST_FUNDER_PRIVATE_KEY } from "./test-config.js";

// Shared funder wallet to avoid nonce conflicts
let _sharedFunder: ethers.Wallet | null = null;

function getSharedFunder(provider: ethers.Provider): ethers.Wallet {
	if (!_sharedFunder || _sharedFunder.provider !== provider) {
		_sharedFunder = new ethers.Wallet(TEST_FUNDER_PRIVATE_KEY, provider);
	}
	return _sharedFunder;
}

/**
 * Get the shared funder wallet (avoids nonce conflicts)
 */
export function getFunderWallet(provider?: ethers.Provider): ethers.Wallet {
	const testProvider = provider || new ethers.JsonRpcProvider(TEST_CONFIG.rpcUrl);
	return getSharedFunder(testProvider);
}

/**
 * Fund a wallet with ETH for testing
 */
export async function fundWallet(address: string, amount: string, provider?: ethers.Provider): Promise<void> {
	const testProvider = provider || new ethers.JsonRpcProvider(TEST_CONFIG.rpcUrl);
	const funder = getSharedFunder(testProvider);

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
