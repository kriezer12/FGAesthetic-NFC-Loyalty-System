import { defineConfig } from "vite"
import reactPlugin from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { fileURLToPath, URL } from "node:url"

function react() {
  return reactPlugin()
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // Keep the pre-bundled dep cache outside node_modules so it
  // survives container rebuilds via its own Docker volume.
  cacheDir: "/vite-cache",
  server: {
    host: true,
    port: 5173,
    // Use native FS events inside the container; fall back to polling
    // only when the CHOKIDAR_USEPOLLING env var is set (Docker on
    // some hosts still needs it).
    watch: {
      usePolling: process.env.CHOKIDAR_USEPOLLING === "true",
      interval: Number(process.env.CHOKIDAR_INTERVAL ?? 500),
    },
    hmr: true,
    // Proxy API requests to backend during development.
    // Uses BACKEND_URL (no VITE_ prefix) so it stays server-side only
    // and is never baked into the browser bundle.
    proxy: {
      "/api": {
        target: process.env.BACKEND_URL || "http://localhost:5000",
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
  // Pre-bundle the heaviest deps explicitly so the first page load
  // doesn't stall while Vite discovers them.
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react-router-dom",
      "@supabase/supabase-js",
      "lucide-react",
      "recharts",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-tooltip",
    ],
  },
})