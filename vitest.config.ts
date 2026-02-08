import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "jsdom",
		include: ["tests/**/*.test.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			include: ["src/**/*.ts"], // src配下を計測対象に
		},
		alias: {
			"@": path.resolve(__dirname, "./src"),
			obsidian: path.resolve(__dirname, "tests/__mocks__/obsidian.ts"),
		},
		// グローバルに `describe`, `it` 等を使えるようにする
		globals: true,
	},
});
