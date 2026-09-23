import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    // Node: el import corre en el servidor (Server Actions), no en el navegador.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
    // Vitest no es un React Server Component, así que `server-only` lanzaría al
    // importarse. Se apunta al mismo archivo vacío que usa React bajo la
    // condición `react-server`: en los tests es un no-op. Su trabajo real —
    // impedir que este código acabe en el bundle del navegador — lo sigue
    // comprobando `next build`.
    conditions: ["react-server", "node", "import"],
  },
});
