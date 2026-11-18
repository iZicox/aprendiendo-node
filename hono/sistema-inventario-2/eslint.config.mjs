// @ts-check
import js from "@eslint/js"
import { defineConfig } from "eslint/config"
import tseslint from "typescript-eslint"

export default defineConfig(
  {
    ignores: [
      "node_modules/",
      ".wrangler/",
      "migration/",
      "worker-configuration.d.ts",
    ],
  },
  {
    files: ["src/**/*.ts", "drizzle.config.ts"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      "no-console": "warn",
      "@typescript-eslint/no-unused-vars": "error",
    },
  },
)
