/**
 * Test configuration and fixtures
 */

import { config } from "dotenv";

// Load environment variables from .env.test if it exists
config({ path: ".env.test" });

/**
 * Default test configuration
 */
export const TEST_CONFIG = {
	// Network configuration
	rpcUrl: process.env.TEST_RPC_URL || "http://127.0.0.1:8545",
	chainId: parseInt(process.env.TEST_CHAIN_ID || "31337"),

	// Bundler configuration
	bundlerUrl: process.env.TEST_BUNDLER_URL || "http://localhost:14337/rpc",
	bundlerWsUrl: process.env.TEST_BUNDLER_WS_URL || "ws://localhost:14337/rpc",

	// Contract addresses (from local deployment)
	entryPointAddress: process.env.TEST_ENTRYPOINT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3",
	walletFactoryAddress: process.env.TEST_WALLET_FACTORY_ADDRESS || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
	operatorManagerAddress: process.env.TEST_OPERATOR_MANAGER_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",

	// Test wallet funding
	fundingAmount: process.env.TEST_FUNDING_AMOUNT || "1.0",
	funderPrivateKey:
		process.env.TEST_FUNDER_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",

	// Feature flags
	skipIntegrationTests: !process.env.RUN_INTEGRATION_TESTS,
};

/**
 * Test mnemonic for deterministic wallet generation
 */
export const TEST_MNEMONIC = process.env.TEST_MNEMONIC || "test test test test test test test test test test test junk";

/**
 * Funder wallet private key (for local testing)
 */
export const TEST_FUNDER_PRIVATE_KEY =
	process.env.TEST_FUNDER_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Anvil account #0
