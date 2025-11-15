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
          // Vite 默认只读取 VITE_ 开头的环境变量，但 loadEnv 会读取所有变量
          // 优先使用 VITE_NEWAPI_BASE_URL，如果没有则使用 NEWAPI_BASE_URL
          target: (env.VITE_NEWAPI_BASE_URL || env.NEWAPI_BASE_URL || "https://x666.me/v1").replace(/\/$/, ""),
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/newapi/, ""),
          configure: (proxy) => {
            const targetUrl = (env.VITE_NEWAPI_BASE_URL || env.NEWAPI_BASE_URL || "https://x666.me/v1").replace(/\/$/, "");
            console.log(`[代理配置] 目标服务器: ${targetUrl}`);
            
            proxy.on("proxyReq", (proxyReq, req) => {
              // 优先使用 VITE_NEWAPI_API_KEY，如果没有则使用 NEWAPI_API_KEY
              const key = env.VITE_NEWAPI_API_KEY || env.NEWAPI_API_KEY;
              if (key) {
                proxyReq.setHeader("Authorization", `Bearer ${key}`);
              } else {
                console.warn("警告: 未找到 NEWAPI_API_KEY 或 VITE_NEWAPI_API_KEY");
              }
              proxyReq.setHeader("Content-Type", "application/json");
              
              // 调试：打印完整的请求 URL
              const protocol = proxyReq.getHeader("x-forwarded-proto") || "https";
              const host = proxyReq.getHeader("host") || targetUrl.replace(/^https?:\/\//, "");
              const path = req.url || "";
              const fullUrl = `${protocol}://${host}${path}`;
              console.log(`[代理] 原始请求: ${req.url}`);
              console.log(`[代理] 转发到完整 URL: ${fullUrl}`);
              console.log(`[代理] 目标服务器: ${targetUrl}`);
            });
            proxy.on("error", (err, req, res) => {
              console.error("[代理错误]", err);
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
