
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiProxy = {
  "/api": {
    target: "http://localhost:3000",
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],

  // Development server
  server: {
    port: 5173,
    strictPort: true,
    proxy: apiProxy,
  },

  // Local preview of the production build
  preview: {
    port: 4173,
    strictPort: true,
    proxy: apiProxy,
  },
});
