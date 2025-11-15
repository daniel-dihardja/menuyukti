import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  plugins: [],

  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },

  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    pool: "threads",

    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
      include: ["lib/**/*.ts"],
    },
  },

  ssr: {
    external: ["xlsx"],
  },
});
