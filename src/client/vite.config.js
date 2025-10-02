import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    https: {
      key: fs.readFileSync(path.join(__dirname, "../..", "certs", "key.pem")),
      cert: fs.readFileSync(path.join(__dirname, "../..", "certs", "cert.pem")),
    },
    proxy: {
      "/api": {
        target: "https://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/auth": {
        target: "https://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
