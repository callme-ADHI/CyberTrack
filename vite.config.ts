import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    // TanStack Start must come BEFORE the react plugin
    tanstackStart({
      server: { entry: "server" }
    }),
    // React plugin is required for dev mode HMR
    react(),
  ],
});
