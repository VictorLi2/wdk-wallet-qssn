import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		setupFiles: ["./tests/setup.ts"],
		testTimeout: 60000, // 60 seconds for integration tests
		hookTimeout: 30000,
		teardownTimeout: 30000,
		include: ["**/*.test.ts"],
		exclude: ["node_modules/**", "dist/**"],
		pool: "forks", // Run tests in separate processes
		poolOptions: {
			forks: {
				singleFork: true, // Run tests sequentially to avoid nonce conflicts
			},
		},
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: ["node_modules/", "dist/", "tests/", "**/*.d.ts", "**/*.config.*", "**/mockData"],
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
