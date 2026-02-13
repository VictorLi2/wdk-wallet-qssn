/**
 * Unit tests for signTypedData (EIP-712) functionality
 */

import { AbiCoder, TypedDataEncoder } from "ethers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WalletAccountQssn } from "../../src/wallet-account-qssn.js";
import { TEST_CONFIG, TEST_MNEMONIC } from "../fixtures/test-config.js";

describe("WalletAccountQssn - signTypedData", () => {
	let account: WalletAccountQssn;

	beforeEach(() => {
		account = new WalletAccountQssn(TEST_MNEMONIC, TEST_MNEMONIC, "0'/0/0", {
			chainId: TEST_CONFIG.chainId,
			provider: TEST_CONFIG.rpcUrl,
			entryPointAddress: TEST_CONFIG.entryPointAddress,
			walletFactoryAddress: TEST_CONFIG.walletFactoryAddress,
			bundlerUrl: TEST_CONFIG.bundlerUrl,
		});

		// Mock getAddress to avoid RPC calls
		vi.spyOn(account, "getAddress").mockResolvedValue("0x1234567890123456789012345678901234567890");
	});

	describe("Input Validation", () => {
		it("should reject when types object is empty", async () => {
			const domain = { name: "Test" };
			const types = {};
			const value = { test: "value" };

			await expect(account.signTypedData(domain, types, value)).rejects.toThrow(
				"signTypedData: types object is required and must not be empty",
			);
		});

		it("should reject when types object is missing", async () => {
			const domain = { name: "Test" };
			const types = null as any;
			const value = { test: "value" };

			await expect(account.signTypedData(domain, types, value)).rejects.toThrow(
				"signTypedData: types object is required and must not be empty",
			);
		});

		it("should reject when types object is undefined", async () => {
			const domain = { name: "Test" };
			const types = undefined as any;
			const value = { test: "value" };

			await expect(account.signTypedData(domain, types, value)).rejects.toThrow(
				"signTypedData: types object is required and must not be empty",
			);
		});

		it("should reject when types has no types defined (only EIP712Domain)", async () => {
			const domain = { name: "Test" };
			const types = { EIP712Domain: [] };
			const value = { test: "value" };

			await expect(account.signTypedData(domain, types, value)).rejects.toThrow(
				"signTypedData: types must contain at least one type definition (excluding EIP712Domain)",
			);
		});

		it("should reject when domain has invalid chainId type", async () => {
			const domain = { name: "Test", chainId: "invalid" as any };
			const types = { Mail: [{ name: "contents", type: "string" }] };
			const value = { contents: "Hello" };

			await expect(account.signTypedData(domain, types, value)).rejects.toThrow(
				"signTypedData: domain.chainId must be a number or bigint",
			);
		});

		it("should reject when domain has invalid verifyingContract type", async () => {
			const domain = { name: "Test", verifyingContract: 123 as any };
			const types = { Mail: [{ name: "contents", type: "string" }] };
			const value = { contents: "Hello" };

			await expect(account.signTypedData(domain, types, value)).rejects.toThrow(
				"signTypedData: domain.verifyingContract must be a string",
			);
		});

		it("should reject when domain has invalid name type", async () => {
			const domain = { name: 123 as any };
			const types = { Mail: [{ name: "contents", type: "string" }] };
			const value = { contents: "Hello" };

			await expect(account.signTypedData(domain, types, value)).rejects.toThrow(
				"signTypedData: domain.name must be a string",
			);
		});

		it("should reject when domain has invalid version type", async () => {
			const domain = { name: "Test", version: 123 as any };
			const types = { Mail: [{ name: "contents", type: "string" }] };
			const value = { contents: "Hello" };

			await expect(account.signTypedData(domain, types, value)).rejects.toThrow(
				"signTypedData: domain.version must be a string",
			);
		});

		it("should reject when domain has invalid salt type", async () => {
			const domain = { name: "Test", salt: 123 as any };
			const types = { Mail: [{ name: "contents", type: "string" }] };
			const value = { contents: "Hello" };

			await expect(account.signTypedData(domain, types, value)).rejects.toThrow(
				"signTypedData: domain.salt must be a string",
			);
		});

		it("should reject when value is missing", async () => {
			const domain = { name: "Test" };
			const types = { Mail: [{ name: "contents", type: "string" }] };
			const value = null as any;

			await expect(account.signTypedData(domain, types, value)).rejects.toThrow(
				"signTypedData: value is required and must be an object",
			);
		});

		it("should reject when value is undefined", async () => {
			const domain = { name: "Test" };
			const types = { Mail: [{ name: "contents", type: "string" }] };
			const value = undefined as any;

			await expect(account.signTypedData(domain, types, value)).rejects.toThrow(
				"signTypedData: value is required and must be an object",
			);
		});

		it("should reject when type field has no name", async () => {
			const domain = { name: "Test" };
			const types = { Mail: [{ type: "string" } as any] };
			const value = { contents: "Hello" };

			await expect(account.signTypedData(domain, types, value)).rejects.toThrow(
				'signTypedData: field in type "Mail" must have a "name" string',
			);
		});

		it("should reject when type field has no type", async () => {
			const domain = { name: "Test" };
			const types = { Mail: [{ name: "contents" } as any] };
			const value = { contents: "Hello" };

			await expect(account.signTypedData(domain, types, value)).rejects.toThrow(
				'signTypedData: field in type "Mail" must have a "type" string',
			);
		});

		it("should reject when type fields is not an array", async () => {
			const domain = { name: "Test" };
			const types = { Mail: "invalid" as any };
			const value = { contents: "Hello" };

			await expect(account.signTypedData(domain, types, value)).rejects.toThrow(
				'signTypedData: type "Mail" must have an array of field definitions',
			);
		});
	});

	describe("EIP-712 Hash Computation", () => {
		it("should compute correct EIP-712 hash for a simple typed data", () => {
			const domain = {
				name: "Ether Mail",
				version: "1",
				chainId: 1,
				verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
			};

			const types = {
				Person: [
					{ name: "name", type: "string" },
					{ name: "wallet", type: "address" },
				],
				Mail: [
					{ name: "from", type: "Person" },
					{ name: "to", type: "Person" },
					{ name: "contents", type: "string" },
				],
			};

			const value = {
				from: {
					name: "Cow",
					wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
				},
				to: {
					name: "Bob",
					wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
				},
				contents: "Hello, Bob!",
			};

			const hash = TypedDataEncoder.hash(domain, types, value);
			expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
			expect(hash).toBe("0xbe609aee343fb3c4b28e1df9e632fca64fcfaede20f02e86244efddf30957bd2");
		});

		it("should handle domain with all optional fields", () => {
			const domain = {
				name: "Test App",
				version: "2",
				chainId: 31337,
				verifyingContract: "0x1234567890123456789012345678901234567890",
				salt: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
			};

			const types = {
				Message: [{ name: "content", type: "string" }],
			};

			const value = { content: "Hello World" };

			const hash = TypedDataEncoder.hash(domain, types, value);
			expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
		});

		it("should handle domain with minimal fields", () => {
			const domain = {
				name: "Minimal",
			};

			const types = {
				Message: [{ name: "text", type: "string" }],
			};

			const value = { text: "Test" };

			const hash = TypedDataEncoder.hash(domain, types, value);
			expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
		});

		it("should produce different hashes for different values", () => {
			const domain = { name: "Test" };
			const types = { Message: [{ name: "text", type: "string" }] };

			const hash1 = TypedDataEncoder.hash(domain, types, { text: "Hello" });
			const hash2 = TypedDataEncoder.hash(domain, types, { text: "World" });

			expect(hash1).not.toBe(hash2);
		});
	});

	describe("Dual Signature Encoding", () => {
		it("should encode signature in QSSN format", async () => {
			// Mock _sendUserOperation to avoid RPC calls
			const mockUserOpHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
			vi.spyOn(account as any, "_sendUserOperation").mockResolvedValue(mockUserOpHash);

			// Mock waitForUserOp to return success
			const mockWaitForUserOp = vi.fn().mockResolvedValue({ success: true });
			vi.spyOn(await import("../../src/utils/bundler-subscription.js"), "waitForUserOp").mockImplementation(
				mockWaitForUserOp,
			);

			const domain = { name: "Test" };
			const types = { Message: [{ name: "text", type: "string" }] };
			const value = { text: "Hello" };

			const result = await account.signTypedData(domain, types, value);

			expect(result.signature).toMatch(/^0x[a-fA-F0-9]+$/);
			expect(result.typedDataHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

			// Verify the signature can be decoded
			const abiCoder = new AbiCoder();
			const decoded = abiCoder.decode(["bytes", "bytes", "bytes", "address"], result.signature);

			expect(decoded.length).toBe(4);
			expect(decoded[0]).toMatch(/^0x[a-fA-F0-9]+$/); // ECDSA signature
			expect(decoded[1]).toMatch(/^0x[a-fA-F0-9]+$/); // ML-DSA signature
			expect(decoded[2]).toMatch(/^0x[a-fA-F0-9]+$/); // ML-DSA public key
			expect(decoded[3]).toMatch(/^0x[a-fA-F0-9]{40}$/); // ECDSA owner address
		});

		it("should use the correct ECDSA owner address in encoding", async () => {
			// Mock _sendUserOperation to avoid RPC calls
			const mockUserOpHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
			vi.spyOn(account as any, "_sendUserOperation").mockResolvedValue(mockUserOpHash);

			const mockWaitForUserOp = vi.fn().mockResolvedValue({ success: true });
			vi.spyOn(await import("../../src/utils/bundler-subscription.js"), "waitForUserOp").mockImplementation(
				mockWaitForUserOp,
			);

			const domain = { name: "Test" };
			const types = { Message: [{ name: "text", type: "string" }] };
			const value = { text: "Hello" };

			const result = await account.signTypedData(domain, types, value);

			const abiCoder = new AbiCoder();
			const decoded = abiCoder.decode(["bytes", "bytes", "bytes", "address"], result.signature);

			const ecdsaOwner = decoded[3];
			const expectedOwner = account.getECDSAAddress();

			expect(ecdsaOwner.toLowerCase()).toBe(expectedOwner.toLowerCase());
		});
	});

	describe("approveHash UserOp", () => {
		it("should submit approveHash UserOp to bundler", async () => {
			const mockUserOpHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
			const mockSendUserOp = vi.spyOn(account as any, "_sendUserOperation").mockResolvedValue(mockUserOpHash);

			const mockWaitForUserOp = vi.fn().mockResolvedValue({ success: true });
			vi.spyOn(await import("../../src/utils/bundler-subscription.js"), "waitForUserOp").mockImplementation(
				mockWaitForUserOp,
			);

			const domain = { name: "Test" };
			const types = { Message: [{ name: "text", type: "string" }] };
			const value = { text: "Hello" };

			await account.signTypedData(domain, types, value);

			// Verify _sendUserOperation was called
			expect(mockSendUserOp).toHaveBeenCalled();

			// Verify the transaction contains approveHash call
			const callArgs = mockSendUserOp.mock.calls[0];
			const txs = callArgs[0] as any[];
			expect(txs).toHaveLength(1);
			expect(txs[0].data).toContain("0x"); // approveHash calldata
		});

		it("should wait for approveHash UserOp confirmation before returning", async () => {
			const userOpHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

			vi.spyOn(account as any, "_sendUserOperation").mockResolvedValue(userOpHash);

			const mockWaitForUserOp = vi.fn().mockResolvedValue({ success: true });
			vi.spyOn(await import("../../src/utils/bundler-subscription.js"), "waitForUserOp").mockImplementation(
				mockWaitForUserOp,
			);

			const domain = { name: "Test" };
			const types = { Message: [{ name: "text", type: "string" }] };
			const value = { text: "Hello" };

			await account.signTypedData(domain, types, value);

			// Verify waitForUserOp was called with the userOpHash
			expect(mockWaitForUserOp).toHaveBeenCalledWith(
				TEST_CONFIG.bundlerUrl,
				userOpHash,
				expect.objectContaining({ timeoutMs: expect.any(Number) }),
			);
		});

		it("should throw if approveHash UserOp fails", async () => {
			vi.spyOn(account as any, "_sendUserOperation").mockRejectedValue(new Error("Bundler error"));

			const domain = { name: "Test" };
			const types = { Message: [{ name: "text", type: "string" }] };
			const value = { text: "Hello" };

			await expect(account.signTypedData(domain, types, value)).rejects.toThrow();
		});

		it("should throw if approveHash UserOp confirmation times out", async () => {
			vi.spyOn(account as any, "_sendUserOperation").mockResolvedValue(
				"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
			);

			const mockWaitForUserOp = vi.fn().mockResolvedValue({
				success: false,
				error: "Timeout waiting for UserOp",
			});
			vi.spyOn(await import("../../src/utils/bundler-subscription.js"), "waitForUserOp").mockImplementation(
				mockWaitForUserOp,
			);

			const domain = { name: "Test" };
			const types = { Message: [{ name: "text", type: "string" }] };
			const value = { text: "Hello" };

			await expect(account.signTypedData(domain, types, value)).rejects.toThrow(
				/signTypedData: approveHash UserOp failed/,
			);
		});

		it("should respect bundlerTimeout config", async () => {
			const customTimeout = 90000;
			const customAccount = new WalletAccountQssn(TEST_MNEMONIC, TEST_MNEMONIC, "0'/0/0", {
				chainId: TEST_CONFIG.chainId,
				provider: TEST_CONFIG.rpcUrl,
				entryPointAddress: TEST_CONFIG.entryPointAddress,
				walletFactoryAddress: TEST_CONFIG.walletFactoryAddress,
				bundlerUrl: TEST_CONFIG.bundlerUrl,
				bundlerTimeout: customTimeout,
			});

			// Mock getAddress for custom account
			vi.spyOn(customAccount, "getAddress").mockResolvedValue("0x1234567890123456789012345678901234567890");

			vi.spyOn(customAccount as any, "_sendUserOperation").mockResolvedValue(
				"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
			);

			const mockWaitForUserOp = vi.fn().mockResolvedValue({ success: true });
			vi.spyOn(await import("../../src/utils/bundler-subscription.js"), "waitForUserOp").mockImplementation(
				mockWaitForUserOp,
			);

			const domain = { name: "Test" };
			const types = { Message: [{ name: "text", type: "string" }] };
			const value = { text: "Hello" };

			await customAccount.signTypedData(domain, types, value);

			// Verify waitForUserOp was called with the custom timeout
			expect(mockWaitForUserOp).toHaveBeenCalledWith(
				TEST_CONFIG.bundlerUrl,
				expect.any(String),
				expect.objectContaining({ timeoutMs: customTimeout }),
			);
		});
	});

	describe("Return Value", () => {
		it("should return encoded signature and typedDataHash", async () => {
			vi.spyOn(account as any, "_sendUserOperation").mockResolvedValue(
				"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
			);

			const mockWaitForUserOp = vi.fn().mockResolvedValue({ success: true });
			vi.spyOn(await import("../../src/utils/bundler-subscription.js"), "waitForUserOp").mockImplementation(
				mockWaitForUserOp,
			);

			const domain = { name: "Test" };
			const types = { Message: [{ name: "text", type: "string" }] };
			const value = { text: "Hello" };

			const result = await account.signTypedData(domain, types, value);

			expect(result).toHaveProperty("signature");
			expect(result).toHaveProperty("typedDataHash");
			expect(result.signature).toMatch(/^0x[a-fA-F0-9]+$/);
			expect(result.typedDataHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
		});

		it("should return signature only after approveHash is confirmed", async () => {
			let waitForUserOpCalled = false;

			vi.spyOn(account as any, "_sendUserOperation").mockResolvedValue(
				"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
			);

			const mockWaitForUserOp = vi.fn().mockImplementation(async () => {
				waitForUserOpCalled = true;
				return { success: true };
			});
			vi.spyOn(await import("../../src/utils/bundler-subscription.js"), "waitForUserOp").mockImplementation(
				mockWaitForUserOp,
			);

			const domain = { name: "Test" };
			const types = { Message: [{ name: "text", type: "string" }] };
			const value = { text: "Hello" };

			const result = await account.signTypedData(domain, types, value);

			// Verify waitForUserOp was called before returning
			expect(waitForUserOpCalled).toBe(true);
			expect(result).toHaveProperty("signature");
		});
	});
});
