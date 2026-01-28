# wdk-wallet-qssn Tests

This directory contains the test suite for the wdk-wallet-qssn package.

## Test Structure

```
tests/
├── unit/                    # Unit tests (no external dependencies)
│   ├── wallet-manager-qssn.test.ts
│   └── wallet-account-qssn.test.ts
├── integration/             # Integration tests (require bundler/node)
│   ├── bundler-interaction.test.ts
│   └── undeployed-wallet.test.ts
├── fixtures/                # Shared test utilities
│   ├── test-config.ts      # Test configuration
│   └── test-helpers.ts     # Helper functions
└── setup.ts                 # Global test setup
```

## Running Tests

### Unit Tests Only

```bash
npm run test:unit
```

Unit tests run quickly and don't require any external services.

### Integration Tests

```bash
npm run test:integration
```

Integration tests require:

- Local Anvil node running on `http://127.0.0.1:8545`
- QSSN bundler running on `http://127.0.0.1:4337`

### All Tests

```bash
npm test
```

Runs only unit tests by default. Integration tests are skipped unless `RUN_INTEGRATION_TESTS=true`.

### Watch Mode

```bash
npm run test:watch
```

### Coverage

```bash
npm run test:coverage
```

## Configuration

Test configuration can be customized via environment variables or `.env.test` file:

```bash
# Network
TEST_RPC_URL=http://127.0.0.1:8545
TEST_CHAIN_ID=31337

# Bundler
TEST_BUNDLER_URL=http://127.0.0.1:4337/0xAa36a7
TEST_BUNDLER_WS_URL=ws://127.0.0.1:4337/0xAa36a7

# Contracts
TEST_ENTRYPOINT_ADDRESS=0x0000000071727De22E5E9d8BAf0edAc6f37da032
TEST_ACCOUNT_FACTORY_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
TEST_OPERATOR_MANAGER_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

# Integration tests
RUN_INTEGRATION_TESTS=true
```

## Writing Tests

### Unit Tests

Unit tests should:

- Test wallet logic in isolation
- Not require external services
- Run quickly
- Be deterministic

Example:

```typescript
import { describe, it, expect } from "vitest";
import { WalletManagerQssn } from "../../src/wallet-manager-qssn.js";

describe("WalletManagerQssn", () => {
	it("should create a wallet", () => {
		const wallet = new WalletManagerQssn(mnemonic, mnemonic, config);
		expect(wallet).toBeInstanceOf(WalletManagerQssn);
	});
});
```

### Integration Tests

Integration tests should:

- Test real-world workflows
- Use `describeIntegration` wrapper (auto-skipped without env var)
- Clean up resources
- Have appropriate timeouts

Example:

```typescript
import { describe, it, expect } from "vitest";
import { TEST_CONFIG } from "../fixtures/test-config.js";

const describeIntegration = TEST_CONFIG.skipIntegrationTests ? describe.skip : describe;

describeIntegration("Integration Test", { timeout: 60000 }, () => {
	it("should work with bundler", async () => {
		// Test implementation
	});
});
```

## CI/CD

In CI environments:

- Only unit tests run by default (fast, no dependencies)
- Integration tests can be enabled with `RUN_INTEGRATION_TESTS=true`
- Coverage reports are generated for unit tests

## Fixtures and Helpers

Common test utilities are in `fixtures/`:

- `test-config.ts`: Centralized test configuration
- `test-helpers.ts`: Helper functions (fundWallet, isContractDeployed, etc.)

Use these to keep tests DRY and maintainable.
