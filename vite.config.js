import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    allowedHosts: ["helpless-customize-smashup.ngrok-free.dev"],
    // or, less strict but fine for local dev: allowedHosts: true
  },
});
