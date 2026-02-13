/**
 * Unit tests for WalletAccountQssn
 */

import { Contract } from "ethers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WalletAccountQssn } from "../../src/wallet-account-qssn.js";
import { TEST_CONFIG, TEST_MNEMONIC } from "../fixtures/test-config.js";

// Mock ethers Contract to avoid real network calls
vi.mock("ethers", async () => {
	const actual = await vi.importActual<typeof import("ethers")>("ethers");
	return {
		...actual,
		Contract: vi.fn().mockImplementation((address, abi, provider) => ({
			getWalletAddress: vi.fn().mockImplementation((mldsaPublicKey: string, ecdsaOwner: string) => {
				// Generate unique address based on public key to simulate different accounts
				const hash = mldsaPublicKey.slice(2, 42); // Use part of pubkey as address
				return `0x${hash.padEnd(40, "0")}`;
			}),
			target: address,
		})),
		JsonRpcProvider: vi.fn().mockImplementation((url) => ({
			_isProvider: true,
			getNetwork: vi.fn().mockResolvedValue({ chainId: TEST_CONFIG.chainId }),
			getCode: vi.fn().mockResolvedValue("0x"),
			getFeeData: vi.fn().mockResolvedValue({
				maxFeePerGas: 1000000000n,
				maxPriorityFeePerGas: 1000000000n,
			}),
		})),
	};
});

describe("WalletAccountQssn", () => {
	describe("constructor", () => {
		it("should create a quantum-safe wallet account", async () => {
			const account = new WalletAccountQssn(TEST_MNEMONIC, TEST_MNEMONIC, "0'/0/0", {
				chainId: TEST_CONFIG.chainId,
				provider: TEST_CONFIG.rpcUrl,
				entryPointAddress: TEST_CONFIG.entryPointAddress,
				walletFactoryAddress: TEST_CONFIG.walletFactoryAddress,
				bundlerUrl: TEST_CONFIG.bundlerUrl,
			});

			expect(account).toBeInstanceOf(WalletAccountQssn);
			const address = await account.getAddress();
			expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
		});

		it("should generate deterministic addresses", async () => {
			const account1 = new WalletAccountQssn(TEST_MNEMONIC, TEST_MNEMONIC, "0'/0/0", {
				chainId: TEST_CONFIG.chainId,
				provider: TEST_CONFIG.rpcUrl,
				entryPointAddress: TEST_CONFIG.entryPointAddress,
				walletFactoryAddress: TEST_CONFIG.walletFactoryAddress,
				bundlerUrl: TEST_CONFIG.bundlerUrl,
			});

			const account2 = new WalletAccountQssn(TEST_MNEMONIC, TEST_MNEMONIC, "0'/0/0", {
				chainId: TEST_CONFIG.chainId,
				provider: TEST_CONFIG.rpcUrl,
				entryPointAddress: TEST_CONFIG.entryPointAddress,
				walletFactoryAddress: TEST_CONFIG.walletFactoryAddress,
				bundlerUrl: TEST_CONFIG.bundlerUrl,
			});

			const address1 = await account1.getAddress();
			const address2 = await account2.getAddress();
			expect(address1).toBe(address2);
		});

		it("should generate different addresses for different paths", async () => {
			const account1 = new WalletAccountQssn(TEST_MNEMONIC, TEST_MNEMONIC, "0'/0/0", {
				chainId: TEST_CONFIG.chainId,
				provider: TEST_CONFIG.rpcUrl,
				entryPointAddress: TEST_CONFIG.entryPointAddress,
				walletFactoryAddress: TEST_CONFIG.walletFactoryAddress,
				bundlerUrl: TEST_CONFIG.bundlerUrl,
			});

			const account2 = new WalletAccountQssn(TEST_MNEMONIC, TEST_MNEMONIC, "0'/0/1", {
				chainId: TEST_CONFIG.chainId,
				provider: TEST_CONFIG.rpcUrl,
				entryPointAddress: TEST_CONFIG.entryPointAddress,
				walletFactoryAddress: TEST_CONFIG.walletFactoryAddress,
				bundlerUrl: TEST_CONFIG.bundlerUrl,
			});

			const address1 = await account1.getAddress();
			const address2 = await account2.getAddress();
			expect(address1).not.toBe(address2);
		});
	});

	describe("key derivation", () => {
		it("should have valid ECDSA public key", () => {
			const account = new WalletAccountQssn(TEST_MNEMONIC, TEST_MNEMONIC, "0'/0/0", {
				chainId: TEST_CONFIG.chainId,
				provider: TEST_CONFIG.rpcUrl,
				entryPointAddress: TEST_CONFIG.entryPointAddress,
				walletFactoryAddress: TEST_CONFIG.walletFactoryAddress,
				bundlerUrl: TEST_CONFIG.bundlerUrl,
			});

			const ecdsaAddress = account.getECDSAAddress();
			expect(ecdsaAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
		});

		it("should have valid ML-DSA public key", () => {
			const account = new WalletAccountQssn(TEST_MNEMONIC, TEST_MNEMONIC, "0'/0/0", {
				chainId: TEST_CONFIG.chainId,
				provider: TEST_CONFIG.rpcUrl,
				entryPointAddress: TEST_CONFIG.entryPointAddress,
				walletFactoryAddress: TEST_CONFIG.walletFactoryAddress,
				bundlerUrl: TEST_CONFIG.bundlerUrl,
			});

			const mldsaPubkeyHex = account.getMLDSAPublicKeyHex();
			expect(mldsaPubkeyHex).toMatch(/^0x[a-fA-F0-9]+$/);
			expect(mldsaPubkeyHex.length).toBeGreaterThan(100); // ML-DSA-87 pubkey is large
		});
	});

	describe("address calculation", () => {
		it("should calculate consistent counterfactual address", async () => {
			const account = new WalletAccountQssn(TEST_MNEMONIC, TEST_MNEMONIC, "0'/0/0", {
				chainId: TEST_CONFIG.chainId,
				provider: TEST_CONFIG.rpcUrl,
				entryPointAddress: TEST_CONFIG.entryPointAddress,
				walletFactoryAddress: TEST_CONFIG.walletFactoryAddress,
				bundlerUrl: TEST_CONFIG.bundlerUrl,
			});

			const address1 = await account.getAddress();
			const address2 = await account.getAddress();

			expect(address1).toBe(address2);
			expect(address1).toMatch(/^0x[a-fA-F0-9]{40}$/);
		});
	});
});
