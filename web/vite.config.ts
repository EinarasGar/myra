import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import tanstackRouter from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = {
    ...loadEnv(mode, path.resolve(__dirname, ".."), ""),
    ...process.env,
  };
  return {
    plugins: [
      tailwindcss(),
      tanstackRouter({ target: "react", autoCodeSplitting: true }),
      react(),
    ],
    resolve: {
      alias: [
        {
          find: "@/hooks/auth/provider",
          replacement: path.resolve(
            __dirname,
            `./src/hooks/auth/${env.AUTH_PROVIDER || "noauth"}-auth-provider`,
          ),
        },
        { find: "@", replacement: path.resolve(__dirname, "./src") },
      ],
    },
    envDir: path.resolve(__dirname, ".."),
    define: {
      __AUTH_PROVIDER__: JSON.stringify(env.AUTH_PROVIDER || "noauth"),
      __CLERK_PUBLISHABLE_KEY__: JSON.stringify(
        env.CLERK_PUBLISHABLE_KEY || "",
      ),
    },
    server: {
      port: Number(env.VITE_PORT) || 5173,
      proxy: {
        "/api": `http://127.0.0.1:${env.SERVER_PORT || "5000"}`,
      },
    },
  };
});
