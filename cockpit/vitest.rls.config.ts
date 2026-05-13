import { defineConfig } from "vitest/config";

/**
 * Vitest-Config fuer DB-gegen-Coolify-Tests (SLC-701 MT-4/6 + SLC-705 MT-1).
 * Laeuft ueber `npm run test:rls` ODER via node:20 Docker-Container im
 * Coolify-Docker-Netzwerk (siehe Dev-System rule `coolify-test-setup.md`).
 *
 * Unterschiede zu vitest.config.ts:
 *   - environment: node (pg braucht TCP, kein jsdom)
 *   - testTimeout: 60s (Netzwerk + Schema-Operationen)
 *   - include: __tests__/rls/** + __tests__/team/** (keine src-Suite)
 *     SLC-705 MT-1 Aggregat-Queries-Tests teilen DB-Setup + pg.Client-Pattern
 *     mit den RLS-Matrix-Tests, daher gemeinsame Config.
 */
export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 60_000,
    include: [
      "__tests__/rls/**/*.test.ts",
      "__tests__/team/**/*.test.ts",
    ],
    exclude: ["node_modules/**", ".next/**", "dist/**"],
    globals: false,
  },
});
