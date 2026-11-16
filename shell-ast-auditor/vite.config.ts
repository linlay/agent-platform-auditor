import { defineConfig, loadEnv } from "vite";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.AUDITOR_API_URL || "http://127.0.0.1:8093";
  return {
    server: {
      proxy: {
        "/api": { target, headers: { Origin: new URL(target).origin } },
      },
    },
  };
});
