import { defineConfig } from "vitest/config";

// Tests run without the reactRouter() Vite plugin, which is for dev and build only.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
  },
});
