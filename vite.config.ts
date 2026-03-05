import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    // pdfjs-dist ships a worker; pre-bundle it so Vite doesn't struggle with it
    include: ["pdfjs-dist"],
  },
  worker: {
    format: "es",
  },
});
