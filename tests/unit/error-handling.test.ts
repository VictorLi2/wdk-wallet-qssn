/**
 * Unit tests for error classes, dispose behavior, and input validation
 */

import { describe, expect, it } from "vitest";
import { BundlerNetworkError, BundlerTimeoutError } from "../../src/errors.js";
import { WalletAccountMldsa } from "../../src/wallet-account-mldsa.js";
import { WalletAccountQssn } from "../../src/wallet-account-qssn.js";
import { WalletManagerQssn } from "../../src/wallet-manager-qssn.js";
import { TEST_CONFIG, TEST_MNEMONIC } from "../fixtures/test-config.js";

describe("BundlerTimeoutError", () => {
	it("should extend Error", () => {
		const error = new BundlerTimeoutError("eth_sendUserOperation", 3);
		expect(error).toBeInstanceOf(Error);
	});

	it("should have name 'BundlerTimeoutError'", () => {
		const error = new BundlerTimeoutError("eth_sendUserOperation", 3);
		expect(error.name).toBe("BundlerTimeoutError");
	});

	it("should include method and attempts in message", () => {
		const error = new BundlerTimeoutError("eth_sendUserOperation", 3);
		expect(error.message).toContain("eth_sendUserOperation");
		expect(error.message).toContain("3 attempt(s)");
	});

	it("should include lastError message when provided", () => {
		const lastError = new Error("timeout");
		const error = new BundlerTimeoutError("eth_send", 2, lastError);
		expect(error.message).toContain("timeout");
	});

	it("should store method, attempts, and lastError properties", () => {
		const lastError = new Error("timeout");
		const error = new BundlerTimeoutError("eth_send", 2, lastError);
		expect(error.method).toBe("eth_send");
		expect(error.attempts).toBe(2);
		expect(error.lastError).toBeInstanceOf(Error);
	});

	it("should handle missing lastError", () => {
		const error = new BundlerTimeoutError("eth_send", 2);
		expect(error.lastError).toBeUndefined();
	});
});

describe("BundlerNetworkError", () => {
	it("should extend Error", () => {
		const error = new BundlerNetworkError("Network failed");
		expect(error).toBeInstanceOf(Error);
	});

	it("should have name 'BundlerNetworkError'", () => {
		const error = new BundlerNetworkError("Network failed");
		expect(error.name).toBe("BundlerNetworkError");
	});

	it("should store message and cause", () => {
		const cause = new TypeError("DNS lookup failed");
		const error = new BundlerNetworkError("Network failed", cause);
		expect(error.message).toBe("Network failed");
		expect(error.cause).toBeInstanceOf(TypeError);
	});

	it("should handle missing cause", () => {
		const error = new BundlerNetworkError("Connection refused");
		expect(error.cause).toBeUndefined();
	});
});

describe("dispose behavior", () => {
	describe("WalletAccountQssn.dispose()", () => {
		it("should call dispose on both ECDSA and ML-DSA accounts", () => {
			const account = new WalletAccountQssn(TEST_MNEMONIC, TEST_MNEMONIC, "0'/0/0", {
				chainId: TEST_CONFIG.chainId,
				provider: TEST_CONFIG.rpcUrl,
				entryPointAddress: TEST_CONFIG.entryPointAddress,
				walletFactoryAddress: TEST_CONFIG.walletFactoryAddress,
				bundlerUrl: TEST_CONFIG.bundlerUrl,
			});

			// Verify account is valid before dispose
			const publicKey = account.getMLDSAPublicKey();
			expect(publicKey).toBeInstanceOf(Uint8Array);

			// Dispose the account
			account.dispose();

			// After dispose, getMLDSAPublicKey should throw
			expect(() => account.getMLDSAPublicKey()).toThrow("Account has been disposed");
		});

		it("should be safe to call dispose multiple times", () => {
			const account = new WalletAccountQssn(TEST_MNEMONIC, TEST_MNEMONIC, "0'/0/0", {
				chainId: TEST_CONFIG.chainId,
				provider: TEST_CONFIG.rpcUrl,
				entryPointAddress: TEST_CONFIG.entryPointAddress,
				walletFactoryAddress: TEST_CONFIG.walletFactoryAddress,
				bundlerUrl: TEST_CONFIG.bundlerUrl,
			});

			// Should not throw when called multiple times
			account.dispose();
			account.dispose();
		});
	});

	describe("WalletAccountMldsa post-dispose", () => {
		it("should throw 'Account has been disposed' when accessing publicKey after dispose", () => {
			const account = new WalletAccountMldsa(TEST_MNEMONIC, "0'/0/0", { securityLevel: 65 });
			account.dispose();

			expect(() => account.publicKey).toThrow("Account has been disposed");
		});

		it("should throw 'Account has been disposed' when accessing publicKeyHex after dispose", () => {
			const account = new WalletAccountMldsa(TEST_MNEMONIC, "0'/0/0", { securityLevel: 65 });

			// Verify it works before dispose
			expect(account.publicKeyHex).toMatch(/^0x[0-9a-f]+$/);

			account.dispose();

			expect(() => account.publicKeyHex).toThrow("Account has been disposed");
		});

		it("should throw 'Account has been disposed' when signing after dispose", async () => {
			const account = new WalletAccountMldsa(TEST_MNEMONIC, "0'/0/0", { securityLevel: 65 });
			account.dispose();

			await expect(account.sign("test")).rejects.toThrow("Account has been disposed");
		});

		it("should throw 'Account has been disposed' when verifying after dispose", async () => {
			const account = new WalletAccountMldsa(TEST_MNEMONIC, "0'/0/0", { securityLevel: 65 });
			account.dispose();

			await expect(account.verify("test", "0x")).rejects.toThrow("Account has been disposed");
		});
	});

	describe("WalletManagerQssn.dispose()", () => {
		it("should dispose all derived accounts", async () => {
			const manager = new WalletManagerQssn(TEST_MNEMONIC, TEST_MNEMONIC, {
				chainId: TEST_CONFIG.chainId,
				provider: TEST_CONFIG.rpcUrl,
				walletFactoryAddress: TEST_CONFIG.walletFactoryAddress,
				bundlerUrl: TEST_CONFIG.bundlerUrl,
			});

			// Get two accounts
			const account0 = await manager.getAccount(0);
			const account1 = await manager.getAccount(1);

			// Verify both work
			expect(account0.getMLDSAPublicKey()).toBeInstanceOf(Uint8Array);
			expect(account1.getMLDSAPublicKey()).toBeInstanceOf(Uint8Array);

			// Dispose manager
			manager.dispose();

			// Verify both accounts are disposed
			expect(() => account0.getMLDSAPublicKey()).toThrow("Account has been disposed");
			expect(() => account1.getMLDSAPublicKey()).toThrow("Account has been disposed");
		});

		it("should clear accounts cache after dispose", async () => {
			const manager = new WalletManagerQssn(TEST_MNEMONIC, TEST_MNEMONIC, {
				chainId: TEST_CONFIG.chainId,
				provider: TEST_CONFIG.rpcUrl,
				walletFactoryAddress: TEST_CONFIG.walletFactoryAddress,
				bundlerUrl: TEST_CONFIG.bundlerUrl,
			});

			// Get account at index 0
			const account0 = await manager.getAccount(0);
			const publicKey0Hex = Buffer.from(account0.getMLDSAPublicKey()).toString("hex");

			// Dispose manager
			manager.dispose();

			// Get account at index 0 again (should create a NEW account, not the disposed one)
			const newAccount0 = await manager.getAccount(0);
			const newPublicKey0 = newAccount0.getMLDSAPublicKey();

			// Verify the new account works (is not disposed)
			expect(newPublicKey0).toBeInstanceOf(Uint8Array);
			expect(newPublicKey0.length).toBeGreaterThan(0);

			// Should be the same key since it's deterministic (compare with saved hex)
			expect(Buffer.from(newPublicKey0).toString("hex")).toBe(publicKey0Hex);
		});
	});
});

describe("invalid input handling", () => {
	it("should throw when walletFactoryAddress is missing", () => {
		expect(
			() =>
				new WalletAccountQssn(TEST_MNEMONIC, TEST_MNEMONIC, "0'/0/0", {
					chainId: 31337,
					provider: "http://localhost:8545",
					entryPointAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
					walletFactoryAddress: "",
					bundlerUrl: "http://localhost:4337",
				}),
		).toThrow();
	});

	it("should throw for invalid ML-DSA security level", () => {
		expect(() => new WalletAccountMldsa(TEST_MNEMONIC, "0'/0/0", { securityLevel: 99 as any })).toThrow(
			"Invalid security level",
		);
	});
});
