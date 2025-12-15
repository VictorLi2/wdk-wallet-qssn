/**
 * Create initCode for wallet deployment
 */
export function createInitCode(factoryAddress: any, mldsaPublicKey: any, ecdsaOwner: any): any;
/**
 * Pack UserOperation for EntryPoint v0.7
 */
export function packUserOp(userOp: any): {
    sender: any;
    nonce: any;
    initCode: any;
    callData: any;
    accountGasLimits: any;
    preVerificationGas: any;
    gasFees: any;
    paymasterAndData: any;
    signature: any;
};
/**
 * Get UserOperation hash for signing (ERC-4337 v0.7)
 */
export function getUserOpHash(userOp: any, entryPointAddress: any, chainId: any): string;
/**
 * Submit UserOperation to bundler
 */
export function submitUserOp(bundlerUrl: any, userOp: any, entryPointAddress: any): Promise<any>;
