import { defineConfig } from "vitest/config";

/**
 * Vitest-Config fuer RLS-Tests (SLC-701 MT-4 + MT-6).
 * Laeuft ueber `npm run test:rls` ODER via node:20 Docker-Container im
 * Coolify-Docker-Netzwerk (siehe Dev-System rule `coolify-test-setup.md`).
 *
 * Unterschiede zu vitest.config.ts:
 *   - environment: node (pg braucht TCP, kein jsdom)
 *   - testTimeout: 60s (Netzwerk + Schema-Operationen)
 *   - include: nur __tests__/rls/** (keine src-Suite)
 */
export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 60_000,
    include: ["__tests__/rls/**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**", "dist/**"],
    globals: false,
  },
});
