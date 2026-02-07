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
/**
 * Error thrown when all bundler retry attempts are exhausted due to timeout or repeated failures.
 */
export class BundlerTimeoutError extends Error {
	constructor(method, attempts, lastError) {
		const message = `Bundler request to ${method} failed after ${attempts} attempt(s)${lastError ? `: ${lastError.message}` : ""}`;
		super(message);
		this.name = "BundlerTimeoutError";
		this.method = method;
		this.attempts = attempts;
		this.lastError = lastError;
	}
}
/**
 * Error thrown for network-level bundler failures.
 */
export class BundlerNetworkError extends Error {
	constructor(message, cause) {
		super(message);
		this.name = "BundlerNetworkError";
		this.cause = cause;
	}
}
//# sourceMappingURL=errors.js.map
