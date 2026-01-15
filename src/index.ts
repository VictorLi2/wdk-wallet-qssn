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

// Main exports
export { WalletManagerQssn } from "./wallet-manager-qssn.js";
export { WalletAccountQssn } from "./wallet-account-qssn.js";
export { WalletAccountReadOnlyQssn } from "./wallet-account-read-only-qssn.js";

// Account classes
export { WalletAccountMldsa } from "./wallet-account-mldsa.js";
export { WalletAccountEvm, WalletAccountEvmJs } from "./wallet-account-evm.js";
export { WalletAccountReadOnlyEvm } from "./wallet-account-read-only-evm.js";

// Utilities
export {
  createQssnConfig,
  getPresetConfig,
  QSSN_CONFIG_PRESETS,
} from "./utils/config-presets.js";
export { MLDSAKeyDerivation } from "./utils/mldsa-key-derivation.js";
export { MLDSASigner } from "./utils/mldsa-signer.js";

// Types
export type {
  // Core config types
  QssnWalletConfig,
  QssnUserConfig,
  ChainPreset,
  PaymasterTokenConfig,
  // ML-DSA types
  MLDSASecurityLevel,
  MLDSAKeyPair,
  // Transaction types
  EvmTransaction,
  TransactionResult,
  TransferOptions,
  TransferResult,
  ApproveOptions,
  EvmTransactionReceipt,
  // Fee and gas types
  FeeRates,
  GasLimits,
  QuoteResult,
  CachedRpcData,
  UserOpOptions,
  // Key types
  KeyPair,
  DualSignature,
} from "./types.js";
