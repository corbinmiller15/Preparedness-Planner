import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "supabase/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "**/*.contract.test.ts"],
  },
});
