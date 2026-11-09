import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset URLs so the build works under a GitHub Pages project subpath.
  base: "./",
  build: {
    chunkSizeWarningLimit: 1000,
  },
});
