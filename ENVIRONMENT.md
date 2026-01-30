# Environment Support

## Default: Browser-Compatible

By default, `@tetherto/wdk-wallet-qssn` uses a browser-compatible ECDSA implementation that works in:
- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ React/Vue/Svelte web applications
- ✅ Vite, Webpack, and other browser bundlers
- ✅ Node.js environments (using pure JavaScript ethers.js)

The browser-compatible version:
- Uses `ethers.js` for all ECDSA operations
- No native dependencies
- No `sodium-universal` or other Node.js-specific modules
- Works everywhere JavaScript runs

## Node.js with Native Performance (Optional)

If you need maximum performance in Node.js environments and can handle native dependencies, you can optionally install:

```bash
pnpm install @tetherto/wdk-wallet-evm
```

This will use Tether's original implementation with:
- Native libsodium bindings via `sodium-universal`
- Faster cryptographic operations
- Bare runtime support

**Note:** This is only recommended for:
- Backend Node.js services
- CLI tools
- Server-side wallet operations
- Environments where native modules can be compiled

**Not compatible with:**
- ❌ Browser bundlers (Vite, Webpack, etc.)
- ❌ Client-side React/Vue/Svelte apps
- ❌ Vercel/Netlify serverless functions (without custom build)

## How It Works

The library automatically uses the pure JavaScript version (`WalletAccountEvmJs`). If you install `@tetherto/wdk-wallet-evm`, you would need to:

1. Add it to `package.json` dependencies:
```json
{
  "dependencies": {
    "@tetherto/wdk-wallet-evm": "^1.0.0-beta.4"
  }
}
```

2. Modify the import in `wallet-account-qssn.js` to conditionally use it

## Recommendation

**For 99% of use cases, stick with the default browser-compatible version.** It works everywhere and has no dependency issues. Only consider the native Node.js version if you:
- Are building a high-performance backend service
- Need to process thousands of signatures per second
- Are comfortable managing native module builds

## Current Implementation

The current implementation uses `WalletAccountEvmJs` by default, which is a pure JavaScript implementation using `ethers.js`. This ensures maximum compatibility across all JavaScript environments.
