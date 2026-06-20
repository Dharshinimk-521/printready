import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    proxy: {
      // Proxy API calls to backend during development
      // /api/jobs/upload -> http://localhost:5000/api/jobs/upload
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },

      // Serve uploaded files from backend
      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});