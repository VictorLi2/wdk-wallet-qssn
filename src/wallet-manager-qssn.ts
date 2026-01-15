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

import { BrowserProvider, JsonRpcProvider } from "ethers";
import type { Provider, Eip1193Provider } from "ethers";

import { WalletAccountQssn } from "./wallet-account-qssn.js";
import { createQssnConfig } from "./utils/config-presets.js";
import type { QssnUserConfig, QssnWalletConfig, FeeRates } from "./types.js";

// Fee rate multipliers (from @tetherto/wdk-wallet-evm)
const FEE_RATE_NORMAL_MULTIPLIER = 100n;
const FEE_RATE_FAST_MULTIPLIER = 115n;

/**
 * Quantum-safe wallet manager with dual-key (ECDSA + ML-DSA) support for ERC-4337.
 */
export class WalletManagerQssn {
  /**
   * The ECDSA seed (mnemonic string or seed bytes).
   */
  public seed: string | Uint8Array;

  /**
   * The ML-DSA seed (mnemonic string or seed bytes).
   */
  public mldsaSeed: string | Uint8Array;

  protected _config: QssnWalletConfig;
  protected _provider: Provider | undefined;
  protected _accounts: Record<string, WalletAccountQssn> = {};

  /**
   * Creates a new quantum-safe wallet manager with dual-key (ECDSA + ML-DSA) support for ERC-4337.
   * bundlerUrl, entryPointAddress, and factoryAddress are automatically set based on chainId.
   *
   * @param ecdsaSeed - The wallet's BIP-39 seed phrase or seed bytes for ECDSA keys.
   * @param mldsaSeed - The wallet's BIP-39 seed phrase or seed bytes for ML-DSA keys.
   * @param userConfig - The configuration object (chainId and provider required, presets applied automatically).
   */
  constructor(
    ecdsaSeed: string | Uint8Array,
    mldsaSeed: string | Uint8Array,
    userConfig: QssnUserConfig
  ) {
    // Apply preset configuration based on chainId
    const config = createQssnConfig(userConfig);

    this.seed = ecdsaSeed;
    this.mldsaSeed = mldsaSeed;
    this._config = config;

    const { provider } = config;

    if (provider) {
      this._provider =
        typeof provider === "string"
          ? new JsonRpcProvider(provider)
          : new BrowserProvider(provider as Eip1193Provider);
    }
  }

  /**
   * Returns the wallet account at a specific index (see BIP-44).
   *
   * @example
   * // Returns the account with derivation path m/44'/60'/0'/0/1
   * const account = await wallet.getAccount(1);
   *
   * @param index - The index of the account to get (default: 0).
   * @returns The account.
   */
  async getAccount(index: number = 0): Promise<WalletAccountQssn> {
    return await this.getAccountByPath(`0'/0/${index}`);
  }

  /**
   * Returns the wallet account at a specific BIP-44 derivation path.
   *
   * @example
   * // Returns the account with derivation path m/44'/60'/0'/0/1
   * const account = await wallet.getAccountByPath("0'/0/1");
   *
   * @param path - The derivation path (e.g. "0'/0/0").
   * @returns The account.
   */
  async getAccountByPath(path: string): Promise<WalletAccountQssn> {
    if (!this._accounts[path]) {
      const account = new WalletAccountQssn(
        this.seed,
        this.mldsaSeed,
        path,
        this._config
      );

      this._accounts[path] = account;
    }

    return this._accounts[path];
  }

  /**
   * Returns the current fee rates.
   *
   * @returns The fee rates (in weis).
   */
  async getFeeRates(): Promise<FeeRates> {
    if (!this._provider) {
      throw new Error(
        "The wallet must be connected to a provider to get fee rates."
      );
    }

    const { maxFeePerGas } = await this._provider.getFeeData();

    if (!maxFeePerGas) {
      throw new Error("Unable to get fee data from provider.");
    }

    return {
      normal: (maxFeePerGas * FEE_RATE_NORMAL_MULTIPLIER) / 100n,
      fast: (maxFeePerGas * FEE_RATE_FAST_MULTIPLIER) / 100n,
    };
  }

  /**
   * Disposes the wallet manager and all derived accounts.
   */
  dispose(): void {
    for (const account of Object.values(this._accounts)) {
      account.dispose();
    }
    this._accounts = {};
  }
}
