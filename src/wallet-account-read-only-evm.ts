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

import { ethers, Contract, JsonRpcProvider, BrowserProvider, Provider } from "ethers";
import type { Eip1193Provider } from "ethers";
import type { QssnWalletConfig } from "./types.js";

/**
 * Pure JavaScript read-only EVM wallet account.
 * Works in browsers, Node.js, and all JavaScript environments.
 */
export class WalletAccountReadOnlyEvm {
  protected _address: string;
  protected _config: Omit<QssnWalletConfig, "transferMaxFee">;
  protected _provider: Provider;

  constructor(
    address: string,
    config: Omit<QssnWalletConfig, "transferMaxFee">
  ) {
    this._address = address;
    this._config = config;

    // Setup provider
    if (config.provider) {
      if (typeof config.provider === "string") {
        this._provider = new JsonRpcProvider(config.provider);
      } else {
        this._provider = new BrowserProvider(config.provider as Eip1193Provider);
      }
    } else {
      throw new Error("Provider is required for read-only account");
    }
  }

  /**
   * Get the native token balance (ETH/MATIC/etc)
   */
  async getBalance(): Promise<bigint> {
    return await this._provider.getBalance(this._address);
  }

  /**
   * Get ERC-20 token balance
   */
  async getTokenBalance(tokenAddress: string): Promise<bigint> {
    const abi = ["function balanceOf(address) view returns (uint256)"];
    const contract = new Contract(tokenAddress, abi, this._provider);
    return await contract.balanceOf(this._address);
  }

  /**
   * Get ERC-20 token allowance
   */
  async getAllowance(token: string, spender: string): Promise<bigint> {
    const abi = [
      "function allowance(address owner, address spender) view returns (uint256)",
    ];
    const contract = new Contract(token, abi, this._provider);
    return await contract.allowance(this._address, spender);
  }
}
