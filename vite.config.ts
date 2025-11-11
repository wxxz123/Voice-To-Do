import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        // Proxy Soniox for dev to avoid CORS; inject Authorization header
        "/api/soniox": {
          target: "https://api.soniox.com",
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/soniox/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              const apiKey = env.VITE_SONIOX_API_KEY;
              if (apiKey) {
                proxyReq.setHeader("Authorization", `Bearer ${apiKey}`);
              }
            });
          },
        },
        // Proxy new 公益API for local development
        "/api/newapi": {
          target: (env.NEWAPI_BASE_URL || env.VITE_NEWAPI_BASE_URL || "https://你的newapi服务器地址/v1").replace(/\/$/, ""),
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/newapi/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              const key = env.NEWAPI_API_KEY;
              if (key) {
                proxyReq.setHeader("Authorization", `Bearer ${key}`);
              }
              proxyReq.setHeader("Content-Type", "application/json");
            });
          },
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
