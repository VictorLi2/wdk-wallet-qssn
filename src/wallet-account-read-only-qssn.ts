// Copyright 2025 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import type { Eip1193Provider, FeeData } from "ethers";
import { BrowserProvider, Contract, Interface, JsonRpcProvider, Provider, toBeHex } from "ethers";
import type {
	CachedRpcData,
	EvmTransaction,
	EvmTransactionReceipt,
	GasLimits,
	PaymasterTokenConfig,
	QssnWalletConfig,
	QuoteResult,
	TransferOptions,
} from "./types.js";
import { WalletAccountReadOnlyEvm } from "./wallet-account-read-only-evm.js";

// ABIs for contract interactions
const FACTORY_ABI = [
	"function getWalletAddress(bytes calldata mldsaPublicKey, address ecdsaOwner) view returns (address)",
	"function createWallet(bytes calldata mldsaPublicKey, address ecdsaOwner) returns (address)",
];

interface UserOp {
	sender: string;
	nonce: string;
	callData: string;
	callGasLimit: string;
	verificationGasLimit: string;
	preVerificationGas: string;
	maxFeePerGas: string;
	maxPriorityFeePerGas: string;
	signature: string;
	factory?: string | null;
	factoryData?: string | null;
}

/**
 * Read-only quantum-safe wallet account with ERC-4337 account abstraction.
 */
export class WalletAccountReadOnlyQssn {
	protected _config: Omit<QssnWalletConfig, "transferMaxFee">;
	protected _provider: JsonRpcProvider | BrowserProvider | undefined;
	protected _chainId: bigint | undefined;
	protected _walletAddress: string | undefined;
	protected _ecdsaOwner: string;
	protected _mldsaPublicKey: Uint8Array;

	constructor(ecdsaOwner: string, mldsaPublicKey: Uint8Array, config: Omit<QssnWalletConfig, "transferMaxFee">) {
		this._config = config;
		this._provider = undefined;
		this._chainId = undefined;
		this._walletAddress = undefined;
		this._ecdsaOwner = ecdsaOwner;
		this._mldsaPublicKey = mldsaPublicKey;

		if (!config.walletFactoryAddress) {
			throw new Error("walletFactoryAddress is required in config");
		}
	}

	/**
	 * Returns the account's address (computed from factory).
	 */
	async getAddress(): Promise<string> {
		if (this._walletAddress) {
			return this._walletAddress;
		}

		const provider = await this._getProvider();
		const factory = new Contract(this._config.walletFactoryAddress, FACTORY_ABI, provider);

		const mldsaPublicKeyHex = "0x" + Buffer.from(this._mldsaPublicKey).toString("hex");
		this._walletAddress = await factory.getWalletAddress(mldsaPublicKeyHex, this._ecdsaOwner);

		return this._walletAddress!;
	}

	/**
	 * Returns the account's ETH balance.
	 */
	async getBalance(): Promise<bigint> {
		const evmReadOnlyAccount = await this._getEvmReadOnlyAccount();
		return await evmReadOnlyAccount.getBalance();
	}

	/**
	 * Returns the account balance for a specific token.
	 */
	async getTokenBalance(tokenAddress: string): Promise<bigint> {
		const evmReadOnlyAccount = await this._getEvmReadOnlyAccount();
		return await evmReadOnlyAccount.getTokenBalance(tokenAddress);
	}

	/**
	 * Returns the account's balance for the paymaster token.
	 */
	async getPaymasterTokenBalance(): Promise<bigint> {
		const { paymasterToken } = this._config;

		if (!paymasterToken) {
			throw new Error("No paymaster token configured. Please provide paymasterToken in the wallet configuration.");
		}

		return await this.getTokenBalance(paymasterToken.address);
	}

	/**
	 * Quotes the costs of a send transaction operation.
	 * Applies the same overhead as _buildUserOp for accurate estimates.
	 */
	async quoteSendTransaction(
		tx: EvmTransaction | EvmTransaction[],
		config?: Partial<QssnWalletConfig>,
	): Promise<QuoteResult> {
		const { paymasterToken } = config ?? this._config;

		try {
			const { fee, totalGas, gasLimits, _cached } = await this._estimateUserOperationGas([tx].flat(), paymasterToken);

			// If bundler returned totalGasEstimate with overhead included, use it directly
			if (totalGas) {
				return {
					fee,
					totalGas,
					gasLimits,
					_cached,
				};
			}

			// Fallback: Apply percentage-based buffer if bundler didn't return totalGasEstimate
			// This ensures the quote matches what will actually be submitted
			const gasBufferPercent = this._config.gasBufferPercent ?? 20;
			const bufferMultiplier = BigInt(100 + gasBufferPercent);
			const applyBuffer = (gas: bigint): bigint => (gas * bufferMultiplier) / 100n;

			// Apply buffer to all gas limits
			const adjustedCallGas = applyBuffer(gasLimits.callGasLimit);
			const adjustedVerificationGas = applyBuffer(gasLimits.verificationGasLimit);
			const adjustedPreVerificationGas = applyBuffer(gasLimits.preVerificationGas);

			// Calculate adjusted fee
			const maxFeePerGas = _cached.feeData.maxFeePerGas || BigInt(1000000000);
			const adjustedTotalGas = adjustedCallGas + adjustedVerificationGas + adjustedPreVerificationGas;
			const adjustedFee = adjustedTotalGas * maxFeePerGas;

			return {
				fee: adjustedFee,
				totalGas: adjustedTotalGas,
				gasLimits: {
					callGasLimit: adjustedCallGas,
					verificationGasLimit: adjustedVerificationGas,
					preVerificationGas: adjustedPreVerificationGas,
				},
				_cached,
			};
		} catch (error) {
			throw error;
		}
	}

	/**
	 * Quotes the costs of a transfer operation.
	 */
	async quoteTransfer(options: TransferOptions, config?: Partial<QssnWalletConfig>): Promise<{ fee: bigint }> {
		const { to, amount, token } = options;

		let tx: EvmTransaction;
		if (token) {
			// ERC-20 token transfer
			const iface = new Interface(["function transfer(address to, uint256 amount) returns (bool)"]);
			tx = {
				to: token,
				value: 0,
				data: iface.encodeFunctionData("transfer", [to, amount]),
			};
		} else {
			// Native ETH transfer
			tx = {
				to,
				value: amount,
				data: "0x",
			};
		}

		const result = await this.quoteSendTransaction(tx, config);
		return result;
	}

	/**
	 * Returns a transaction's receipt.
	 */
	async getTransactionReceipt(hash: string): Promise<EvmTransactionReceipt | null> {
		try {
			const response = await fetch(this._config.bundlerUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: 1,
					method: "eth_getUserOperationReceipt",
					params: [hash],
				}),
			});

			const result = (await response.json()) as {
				result?: { receipt?: EvmTransactionReceipt };
				error?: { message: string };
			};

			if (result.result && result.result.receipt) {
				return result.result.receipt;
			}

			return null;
		} catch {
			return null;
		}
	}

	/**
	 * Returns the current allowance for the given token and spender.
	 */
	async getAllowance(token: string, spender: string): Promise<bigint> {
		const readOnlyAccount = await this._getEvmReadOnlyAccount();
		return await readOnlyAccount.getAllowance(token, spender);
	}

	/**
	 * Returns the provider instance.
	 */
	protected async _getProvider(): Promise<JsonRpcProvider | BrowserProvider> {
		if (!this._provider) {
			const { provider } = this._config;
			this._provider =
				typeof provider === "string" ? new JsonRpcProvider(provider) : new BrowserProvider(provider as Eip1193Provider);
		}
		return this._provider;
	}

	/**
	 * Returns the chain id.
	 */
	protected async _getChainId(): Promise<bigint> {
		if (!this._chainId) {
			const provider = await this._getProvider();
			const { chainId } = await provider.getNetwork();
			this._chainId = chainId;
		}
		return this._chainId;
	}

	private async _getEvmReadOnlyAccount(): Promise<WalletAccountReadOnlyEvm> {
		const address = await this.getAddress();
		return new WalletAccountReadOnlyEvm(address, this._config);
	}

	/**
	 * Estimates gas cost for a UserOperation by querying the bundler.
	 */
	protected async _estimateUserOperationGas(
		txs: EvmTransaction[],
		_paymasterToken?: PaymasterTokenConfig,
	): Promise<{ fee: bigint; totalGas?: bigint; gasLimits: GasLimits; _cached: CachedRpcData }> {
		const walletAddress = await this.getAddress();
		const provider = await this._getProvider();
		const entryPoint = new Contract(
			this._config.entryPointAddress,
			["function getNonce(address sender, uint192 key) view returns (uint256)"],
			provider,
		);

		// Fetch all RPC data in parallel
		const [nonce, code, feeData] = await Promise.all([
			entryPoint.getNonce(walletAddress, 0) as Promise<bigint>,
			provider.getCode(walletAddress),
			provider.getFeeData(),
		]);

		const isDeployed = code !== "0x";

		// Create factory and factoryData if not deployed
		let factory: string | null = null;
		let factoryData: string | null = null;
		if (!isDeployed) {
			factory = this._config.walletFactoryAddress;
			const factoryInterface = new Interface([
				"function createWallet(bytes calldata mldsaPublicKey, address ecdsaOwner) returns (address)",
			]);
			const mldsaPublicKeyHex = "0x" + Buffer.from(this._mldsaPublicKey).toString("hex");
			factoryData = factoryInterface.encodeFunctionData("createWallet", [mldsaPublicKeyHex, this._ecdsaOwner]);
		}

		// Encode callData for execute function
		let callData: string;
		if (txs.length === 1) {
			const wallet = new Interface(["function execute(address target, uint256 value, bytes calldata data) external"]);
			callData = wallet.encodeFunctionData("execute", [txs[0].to, txs[0].value || 0, txs[0].data || "0x"]);
		} else {
			const wallet = new Interface([
				"struct Call { address target; uint256 value; bytes data; }",
				"function executeBatch(Call[] calldata calls) external",
			]);
			const calls = txs.map((tx) => ({
				target: tx.to,
				value: tx.value || 0,
				data: tx.data || "0x",
			}));
			callData = wallet.encodeFunctionData("executeBatch", [calls]);
		}

		// Empty signature - the bundler will construct the appropriate QSSN dummy signature
		// Only ABI structure matters for estimation, not actual key values
		const dummySignature = "0x";

		// Build UserOp for gas estimation
		const userOp: UserOp = {
			sender: walletAddress,
			nonce: toBeHex(nonce),
			callData,
			callGasLimit: "0x0",
			verificationGasLimit: "0x0",
			preVerificationGas: "0x0",
			maxFeePerGas: "0x0",
			maxPriorityFeePerGas: "0x0",
			signature: dummySignature,
		};

		if (!isDeployed) {
			userOp.factory = factory;
			userOp.factoryData = factoryData;
		}

		// Query bundler for gas estimates
		const response = await fetch(this._config.bundlerUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method: "eth_estimateUserOperationGas",
				params: [userOp, this._config.entryPointAddress],
			}),
		});

		const result = (await response.json()) as {
			result?: {
				callGasLimit: string;
				verificationGasLimit: string;
				preVerificationGas: string;
				totalGasEstimate?: string; // Includes EntryPoint overhead
			};
			error?: { message: string };
		};

		if (result.error) {
			throw new Error(result.error.message);
		}

		if (!result.result) {
			throw new Error("No gas estimation result returned from bundler");
		}

		const { callGasLimit, verificationGasLimit, preVerificationGas, totalGasEstimate } = result.result;

		const maxFeePerGas = feeData.maxFeePerGas || 1000000000n;

		// Use totalGasEstimate from bundler if available (includes EntryPoint overhead)
		// Otherwise fall back to sum of components
		const totalGas = totalGasEstimate
			? BigInt(totalGasEstimate)
			: BigInt(callGasLimit) + BigInt(verificationGasLimit) + BigInt(preVerificationGas);
		const gasCostInWei = totalGas * maxFeePerGas;

		return {
			fee: gasCostInWei,
			totalGas, // Total gas including EntryPoint overhead (if bundler provides it)
			gasLimits: {
				callGasLimit: BigInt(callGasLimit),
				verificationGasLimit: BigInt(verificationGasLimit),
				preVerificationGas: BigInt(preVerificationGas),
			},
			_cached: {
				nonce,
				isDeployed,
				feeData: {
					maxFeePerGas: feeData.maxFeePerGas,
					maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
				},
			},
		};
	}
}
