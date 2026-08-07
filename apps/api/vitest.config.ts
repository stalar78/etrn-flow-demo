import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@etrn-flow/domain": fileURLToPath(
        new URL("../../packages/domain/src/index.ts", import.meta.url)
      ),
      "@etrn-flow/shared": fileURLToPath(
        new URL("../../packages/shared/src/index.ts", import.meta.url)
      )
    }
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["src/**/*.integration.test.ts"],
    testTimeout: 15_000
  }
});
