// UserWallet-specific helper functions for ERC-4337 operations

import { ethers } from 'ethers'

// ABIs for contract interactions
const FACTORY_ABI = [
  'function getWalletAddress(bytes calldata mldsaPublicKey, address ecdsaOwner) view returns (address)',
  'function createWallet(bytes calldata mldsaPublicKey, address ecdsaOwner) returns (address)'
]

const WALLET_ABI = [
  'function execute(address target, uint256 value, bytes calldata data) external'
]

const ENTRYPOINT_ABI = [
  'function getNonce(address sender, uint192 key) view returns (uint256)'
]

/**
 * Create initCode for wallet deployment
 */
export function createInitCode(factoryAddress, mldsaPublicKey, ecdsaOwner) {
  const factory = new ethers.Interface(FACTORY_ABI)
  const mldsaPublicKeyHex = '0x' + Buffer.from(mldsaPublicKey).toString('hex')
  const callData = factory.encodeFunctionData('createWallet', [mldsaPublicKeyHex, ecdsaOwner])
  return ethers.hexConcat([factoryAddress, callData])
}

/**
 * Pack UserOperation for EntryPoint v0.7
 */
export function packUserOp(userOp) {
  const accountGasLimits = ethers.hexConcat([
    ethers.zeroPadValue(ethers.toBeHex(userOp.verificationGasLimit), 16),
    ethers.zeroPadValue(ethers.toBeHex(userOp.callGasLimit), 16)
  ])
  
  const gasFees = ethers.hexConcat([
    ethers.zeroPadValue(ethers.toBeHex(userOp.maxPriorityFeePerGas), 16),
    ethers.zeroPadValue(ethers.toBeHex(userOp.maxFeePerGas), 16)
  ])
  
  return {
    sender: userOp.sender,
    nonce: userOp.nonce,
    initCode: userOp.initCode || '0x',
    callData: userOp.callData,
    accountGasLimits,
    preVerificationGas: userOp.preVerificationGas,
    gasFees,
    paymasterAndData: userOp.paymasterAndData || '0x',
    signature: userOp.signature
  }
}

/**
 * Get UserOperation hash for signing (ERC-4337 v0.7)
 */
export function getUserOpHash(userOp, entryPointAddress, chainId) {
  const packedUserOp = packUserOp(userOp)
  
  // Hash the packed UserOp according to ERC-4337 v0.7
  const userOpHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256', 'bytes32', 'bytes32', 'bytes32', 'uint256', 'bytes32', 'bytes32', 'bytes32'],
      [
        packedUserOp.sender,
        packedUserOp.nonce,
        ethers.keccak256(packedUserOp.initCode),
        ethers.keccak256(packedUserOp.callData),
        packedUserOp.accountGasLimits,
        packedUserOp.preVerificationGas,
        packedUserOp.gasFees,
        ethers.keccak256(packedUserOp.paymasterAndData),
        ethers.keccak256('0x') // Signature is empty for hash computation
      ]
    )
  )
  
  // Add EntryPoint and chainId according to ERC-4337
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'address', 'uint256'],
      [userOpHash, entryPointAddress, chainId]
    )
  )
}

/**
 * Submit UserOperation to bundler
 */
export async function submitUserOp(bundlerUrl, userOp, entryPointAddress) {
  const response = await fetch(bundlerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_sendUserOperation',
      params: [userOp, entryPointAddress]
    })
  })
  
  const result = await response.json()
  
  if (result.error) {
    throw new Error(`Bundler error: ${result.error.message}`)
  }
  
  return result.result // UserOp hash
}
