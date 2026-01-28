/**
 * Test setup and global configuration
 */

import { beforeAll } from "vitest";
import { TEST_CONFIG } from "./fixtures/test-config";

// Set test environment variables
process.env.NODE_ENV = "test";

/**
 * Check if Anvil is running
 */
async function checkAnvilConnection(): Promise<boolean> {
	if (TEST_CONFIG.skipIntegrationTests) {
		return false;
	}

	try {
		const response = await fetch(TEST_CONFIG.rpcUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				method: "eth_chainId",
				params: [],
				id: 1,
			}),
		});

		if (!response.ok) {
			return false;
		}

		const result = await response.json();
		return !result.error;
	} catch {
		return false;
	}
}

/**
 * Check if bundler is running
 */
async function checkBundlerConnection(): Promise<boolean> {
	if (TEST_CONFIG.skipIntegrationTests) {
		return false;
	}

	try {
		const response = await fetch(TEST_CONFIG.bundlerUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				method: "eth_supportedEntryPoints",
				params: [],
				id: 1,
			}),
		});

		if (!response.ok) {
			return false;
		}

		const result = await response.json();
		return !result.error;
	} catch {
		return false;
	}
}

// Global setup - runs once before all tests
beforeAll(async () => {
	if (!TEST_CONFIG.skipIntegrationTests) {
		console.log("\n🔧 Test Setup: Checking test environment...");

		const isAnvilRunning = await checkAnvilConnection();
		const isBundlerRunning = await checkBundlerConnection();

		if (isAnvilRunning) {
			console.log("✓ Anvil is running on", TEST_CONFIG.rpcUrl);
		} else {
			console.log("⚠️  Anvil is not running - start with: anvil --port 8545");
		}

		if (isBundlerRunning) {
			console.log("✓ Bundler is running on", TEST_CONFIG.bundlerUrl);
		} else {
			console.log("⚠️  Bundler is not running - integration tests will fail");
		}

		if (!isAnvilRunning || !isBundlerRunning) {
			console.log("\n💡 Tip: Tests will fail without both services running");
			console.log("   To run without restarting Anvil, tests use unique accounts per run");
		} else {
			console.log("\n✓ Test environment ready");
		}
	}
});
