// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => ({
  base: "./", // 🔑 REQUIRED for cPanel / shared hosting

  define: {
    "process.env.NODE_ENV": JSON.stringify(mode),
  },

  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    tailwindcss(),
  ],
}));
