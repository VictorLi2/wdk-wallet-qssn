/**
 * Unit tests for WalletManagerQssn
 */

import { describe, expect, it, vi } from "vitest";
import { WalletManagerQssn } from "../../src/wallet-manager-qssn.js";
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

describe("WalletManagerQssn", () => {
	describe("constructor", () => {
		it("should create a wallet manager with mnemonic seeds", () => {
			const wallet = new WalletManagerQssn(TEST_MNEMONIC, TEST_MNEMONIC, {
				chainId: TEST_CONFIG.chainId,
				provider: TEST_CONFIG.rpcUrl,
				bundlerUrl: TEST_CONFIG.bundlerUrl,
				walletFactoryAddress: TEST_CONFIG.walletFactoryAddress,
			});

			expect(wallet).toBeInstanceOf(WalletManagerQssn);
			expect(wallet.seed).toBe(TEST_MNEMONIC);
			expect(wallet.mldsaSeed).toBe(TEST_MNEMONIC);
		});

		it("should create a wallet manager with custom config", () => {
			const customConfig = {
				chainId: TEST_CONFIG.chainId,
				provider: TEST_CONFIG.rpcUrl,

				bundlerUrl: TEST_CONFIG.bundlerUrl,
				walletFactoryAddress: TEST_CONFIG.walletFactoryAddress,
			};

			const wallet = new WalletManagerQssn(TEST_MNEMONIC, TEST_MNEMONIC, customConfig);

			expect(wallet).toBeInstanceOf(WalletManagerQssn);
		});
	});

	describe("getAccount", () => {
		it("should return account at index 0 by default", async () => {
			const wallet = new WalletManagerQssn(TEST_MNEMONIC, TEST_MNEMONIC, {
				chainId: TEST_CONFIG.chainId,
				provider: TEST_CONFIG.rpcUrl,
				bundlerUrl: TEST_CONFIG.bundlerUrl,
				walletFactoryAddress: TEST_CONFIG.walletFactoryAddress,
			});

			const account = await wallet.getAccount();
			expect(account).toBeDefined();
			const address = await account.getAddress();
			expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
		});

		it("should return account at specific index", async () => {
			const wallet = new WalletManagerQssn(TEST_MNEMONIC, TEST_MNEMONIC, {
				chainId: TEST_CONFIG.chainId,
				provider: TEST_CONFIG.rpcUrl,
				bundlerUrl: TEST_CONFIG.bundlerUrl,
				walletFactoryAddress: TEST_CONFIG.walletFactoryAddress,
			});

			const account0 = await wallet.getAccount(0);
			const account1 = await wallet.getAccount(1);

			const address0 = await account0.getAddress();
			const address1 = await account1.getAddress();
			expect(address0).not.toBe(address1);
		});

		it("should cache accounts", async () => {
			const wallet = new WalletManagerQssn(TEST_MNEMONIC, TEST_MNEMONIC, {
				chainId: TEST_CONFIG.chainId,
				provider: TEST_CONFIG.rpcUrl,
				bundlerUrl: TEST_CONFIG.bundlerUrl,
				walletFactoryAddress: TEST_CONFIG.walletFactoryAddress,
			});

			const account1 = await wallet.getAccount(0);
			const account2 = await wallet.getAccount(0);

			expect(account1).toBe(account2); // Same instance
		});
	});

	describe("getAccountByPath", () => {
		it("should return account at custom derivation path", async () => {
			const wallet = new WalletManagerQssn(TEST_MNEMONIC, TEST_MNEMONIC, {
				chainId: TEST_CONFIG.chainId,
				provider: TEST_CONFIG.rpcUrl,
				bundlerUrl: TEST_CONFIG.bundlerUrl,
				walletFactoryAddress: TEST_CONFIG.walletFactoryAddress,
			});

			const account = await wallet.getAccountByPath("0'/0/5");
			expect(account).toBeDefined();
			const address = await account.getAddress();
			expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
		});

		it("should return different accounts for different paths", async () => {
			const wallet = new WalletManagerQssn(TEST_MNEMONIC, TEST_MNEMONIC, {
				chainId: TEST_CONFIG.chainId,
				provider: TEST_CONFIG.rpcUrl,
				bundlerUrl: TEST_CONFIG.bundlerUrl,
				walletFactoryAddress: TEST_CONFIG.walletFactoryAddress,
			});

			const account1 = await wallet.getAccountByPath("0'/0/0");
			const account2 = await wallet.getAccountByPath("0'/0/1");

			const address1 = await account1.getAddress();
			const address2 = await account2.getAddress();
			expect(address1).not.toBe(address2);
		});
	});

	describe("deterministic address generation", () => {
		it("should generate the same addresses from same mnemonic", async () => {
			const wallet1 = new WalletManagerQssn(TEST_MNEMONIC, TEST_MNEMONIC, {
				chainId: TEST_CONFIG.chainId,
				provider: TEST_CONFIG.rpcUrl,
				bundlerUrl: TEST_CONFIG.bundlerUrl,
				walletFactoryAddress: TEST_CONFIG.walletFactoryAddress,
			});

			const wallet2 = new WalletManagerQssn(TEST_MNEMONIC, TEST_MNEMONIC, {
				chainId: TEST_CONFIG.chainId,
				provider: TEST_CONFIG.rpcUrl,
				bundlerUrl: TEST_CONFIG.bundlerUrl,
				walletFactoryAddress: TEST_CONFIG.walletFactoryAddress,
			});

			const account1 = await wallet1.getAccount(0);
			const account2 = await wallet2.getAccount(0);

			const address1 = await account1.getAddress();
			const address2 = await account2.getAddress();
			expect(address1).toBe(address2);
		});
	});
});
