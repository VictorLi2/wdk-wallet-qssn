# Paymaster Integration Guide

## Introduction

A paymaster is a smart contract that sponsors gas fees for UserOperations in the ERC-4337 account abstraction framework. In QSSN, paymasters enable sponsored transactions where users pay in ERC-20 tokens (such as USDT) instead of native ETH for gas fees.

In a sponsored transaction, the paymaster pays the gas cost in ETH from its deposit in the EntryPoint contract, and the user pays the paymaster back in the configured ERC-20 token. After each sponsored operation, the EntryPoint decrements the paymaster's deposit by the actual gas cost. This allows users to transact without holding ETH, simplifying the user experience for dApp developers.

## SDK Configuration

To enable paymaster functionality in the QSSN SDK, you must provide three required configuration fields together (all-or-none):

- **`paymasterUrl`** (string): URL of the paymaster service endpoint that constructs paymaster data
- **`paymasterAddress`** (string): On-chain address of the paymaster contract
- **`paymasterToken`** (`PaymasterTokenConfig`): Object containing the ERC-20 token address that the paymaster accepts for payment

The `PaymasterTokenConfig` type is defined as:

```typescript
interface PaymasterTokenConfig {
  address: string;
}
```

### Configuration Example

```typescript
import { createQssnConfig } from '@tetherto/wdk-wallet-qssn';

const config = createQssnConfig({
  chainId: 11155111,
  provider: 'https://rpc.sepolia.org',
  bundlerUrl: 'https://bundler.example.com',
  walletFactoryAddress: '0x...FactoryAddress',
  // Paymaster configuration (all three required together)
  paymasterUrl: 'https://paymaster.example.com',
  paymasterAddress: '0x...PaymasterContractAddress',
  paymasterToken: { address: '0x...TokenAddress' },
});
```

**Important:** If you provide any paymaster field, you must provide all three. If any field is missing, `createQssnConfig()` throws an error listing the missing fields:

```
Incomplete paymaster configuration. To use a paymaster, you must provide all three fields: paymasterUrl, paymasterAddress, and paymasterToken. Missing: [field names]
```

### Additional Configuration Options

The following `QssnWalletConfig` fields affect paymaster usage:

- **`gasBufferPercent`** (default: 20): Adds a safety margin to gas estimates. The SDK uses this to calculate token approval amounts (estimated fee × 120%).
- **`bundlerTimeout`** (default: 30000ms): Timeout for bundler RPC calls, including gas estimation with paymaster parameters.
- **`bundlerRetries`** (default: 3): Number of retry attempts for transient bundler failures.

## Sponsored Transaction Flow

Here's a complete step-by-step walkthrough of sending a sponsored transaction:

1. **Configure the SDK** with paymaster fields (as shown above)
2. **Create a wallet account** using `WalletManagerQssn`
3. **Check paymaster token balance** to ensure the wallet has sufficient tokens to pay for gas
4. **Get a fee estimate** — the SDK passes the paymaster token configuration to the bundler during estimation
5. **Send the transaction** — the SDK automatically calculates token approval amounts and passes paymaster parameters to the bundler
6. **Bundler processes the UserOp** — validates paymaster balance and reputation, constructs `paymasterAndData`, and submits the transaction

### Complete Code Example

```typescript
import { WalletManagerQssn, createQssnConfig } from '@tetherto/wdk-wallet-qssn';

// 1. Configure with paymaster
const config = createQssnConfig({
  chainId: 11155111,
  provider: 'https://rpc.sepolia.org',
  bundlerUrl: 'https://bundler.example.com',
  walletFactoryAddress: '0x...FactoryAddress',
  paymasterUrl: 'https://paymaster.example.com',
  paymasterAddress: '0x...PaymasterAddress',
  paymasterToken: { address: '0x...USDTAddress' },
});

// 2. Create wallet
const manager = new WalletManagerQssn(ecdsaSeed, mldsaSeed, config);
const account = await manager.getAccount(0);

// 3. Check paymaster token balance
const tokenBalance = await account.getPaymasterTokenBalance();
console.log('Paymaster token balance:', tokenBalance);

// 4. Estimate fees
const quote = await account.quoteSendTransaction({
  to: '0x...Recipient',
  value: 0n,
  data: '0x...calldata',
});
console.log('Estimated fee:', quote.fee);

// 5. Send sponsored transaction
const result = await account.sendTransaction({
  to: '0x...Recipient',
  value: 0n,
  data: '0x...calldata',
});
console.log('UserOp hash:', result.hash);
```

**Note:** The SDK handles paymaster parameters automatically when paymaster configuration is set. You don't need to add extra paymaster-specific code in `sendTransaction()` or `transfer()` calls — these methods detect the paymaster configuration and pass the appropriate fields to the bundler automatically.

The SDK calculates token approval amounts using a 20% fee tolerance coefficient (defined as `FEE_TOLERANCE_COEFFICIENT = 120n` in the source). This means the approval amount is 120% of the estimated fee, providing a buffer for gas price fluctuations.

## The `paymasterAndData` Field

In ERC-4337, the `paymasterAndData` field in a UserOperation identifies which paymaster contract sponsors the operation and includes paymaster-specific data such as signatures or timestamps.

### SDK's Role

The SDK does **not** construct the `paymasterAndData` field directly. Instead, it sends paymaster configuration to the bundler, and the bundler (or an external paymaster service at `paymasterUrl`) constructs the field.

The SDK passes the following information as a third parameter to the `eth_sendUserOperation` RPC call:

- `paymasterUrl`: The paymaster service endpoint
- `paymasterAddress`: The on-chain paymaster contract address
- `paymasterTokenAddress`: The ERC-20 token address for payment
- `amountToApprove`: The calculated token approval amount (120% of estimated fee)

### UserOp Hash Calculation

The `paymasterAndData` field is included in the UserOperation hash calculation as part of the packed UserOperation format. During local hash computation (before the bundler fills in `paymasterAndData`), the SDK uses `keccak256("0x")` for the empty `paymasterAndData` field. This allows the SDK to sign the UserOp before the bundler adds the actual paymaster data.

The bundler fills in the real `paymasterAndData` value after signature verification and before on-chain submission.

## Bundler-Side Behavior

The QSSN bundler performs paymaster validation at multiple points during UserOperation processing. Understanding this behavior helps you troubleshoot paymaster-related errors.

### Paymaster Balance Validation

The bundler validates that the paymaster has sufficient ETH deposited in the EntryPoint contract:

**At estimation time** (`eth_estimateUserOperationGas`): The bundler checks that the paymaster has a minimum deposit in the EntryPoint (currently 0.001 ETH threshold). If the paymaster deposit is below this threshold, estimation fails with a "Paymaster has insufficient deposit" error.

**At submission time** (`eth_sendUserOperation`): The bundler checks the paymaster's EntryPoint deposit against the actual estimated prefund cost for the UserOp. If the deposit is below the required amount, submission is rejected with an error message indicating the deposit amount and required prefund.

The bundler uses `checkPaymasterBalance()` from its shared validation module, which queries `entryPoint.balanceOf(paymasterAddress)` to check the deposit.

### Paymaster Reputation

The bundler tracks entity reputation per the ERC-4337 specification to prevent spam and malicious behavior:

**Banned paymasters**: Completely rejected at both estimation and submission time. When a paymaster is banned, any UserOp referencing it is rejected with error code `-32504`. The bundler will refuse to process operations from a banned paymaster until the ban is lifted.

**Throttled paymasters**: NOT rejected at estimation or submission time — they are only rate-limited in the mempool. Throttled paymasters can still be used, but the bundler limits how many UserOps from a throttled paymaster can be pending in the mempool simultaneously. If the limit is reached, new UserOps may be rejected until pending operations are processed.

The bundler uses `checkEntityReputation()` from its shared validation module to enforce these policies.

## Troubleshooting

### Insufficient Paymaster Balance (AA50)

**Error:** `"Not enough funds on the wallet account to repay the paymaster."`

**Cause:** The user's wallet doesn't have enough of the paymaster's accepted token to cover the gas fee.

**Solution:** Ensure the wallet has sufficient paymaster token balance before sending transactions. Use `account.getPaymasterTokenBalance()` to check the balance. The SDK automatically applies a 20% fee tolerance (120% of estimated fee) when calculating the token approval amount, but the wallet must have at least this amount available.

### Paymaster Deposit Too Low

**Error:** `"paymaster 0x... deposit X is below required prefund Y"` or `"Paymaster 0x... has insufficient deposit"`

**Cause:** The paymaster contract hasn't deposited enough ETH into the EntryPoint to cover gas costs for sponsored transactions.

**This is a paymaster operator issue, not a user issue.** Users cannot fix this problem directly.

**Solution:** The paymaster operator needs to deposit more ETH into the EntryPoint contract using `entryPoint.depositTo(paymasterAddress)`. If you are integrating with a third-party paymaster service, contact their support team.

### Banned Paymaster

**Error:** `"paymaster 0x... is banned"` (error code `-32504`)

**Cause:** The bundler has banned this paymaster due to repeated validation failures, on-chain reverts, or malicious behavior.

**Solution:** Use a different paymaster. If you operate the paymaster, investigate why it was banned by checking bundler logs and paymaster contract behavior. Contact the bundler operator to understand the ban reason and potential remediation steps.

### Throttled Paymaster

**Error:** `"paymaster 0x... is throttled"` (error code `-32504`)

**Cause:** The paymaster has been rate-limited by the bundler due to a high volume of operations or reputation issues.

**Note:** Throttled paymasters are still allowed to process transactions — they just have mempool limits. UserOps may be rejected if the throttled paymaster already has too many pending operations in the mempool.

**Solution:** Wait and retry the transaction after some pending operations are processed. Alternatively, reduce the number of concurrent operations using this paymaster. Throttling is typically temporary and resolves as the mempool clears.

### Incomplete Paymaster Configuration

**Error:** `"Incomplete paymaster configuration. To use a paymaster, you must provide all three fields: paymasterUrl, paymasterAddress, and paymasterToken. Missing: [field names]"`

**Cause:** Only some paymaster configuration fields were provided to `createQssnConfig()`.

**Solution:** Provide all three paymaster fields (`paymasterUrl`, `paymasterAddress`, `paymasterToken`) together, or provide none of them. The SDK enforces this all-or-none requirement to prevent misconfiguration.

### Token Approval Issues

If the paymaster requires ERC-20 token payment, the user's wallet must have approved the paymaster contract to spend tokens on its behalf.

The SDK handles token approval amounts automatically (120% of estimated fee) when paymaster configuration is set. No manual approval is needed in most cases.

**Special case for USDT on Ethereum mainnet:** The USDT token contract requires that the current allowance be reset to 0 before setting a new non-zero value. The SDK enforces this requirement and throws an error if you attempt to approve a non-zero amount when a non-zero allowance already exists:

```
USDT requires the current allowance to be reset to 0 before setting a new non-zero value. Please send an "approve" transaction with an amount of 0 first.
```

To fix this, send an approval transaction with `amount: 0` first, then send your actual approval transaction.
