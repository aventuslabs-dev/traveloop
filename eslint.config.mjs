import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    /**
     * One-off Playwright scripts used to eyeball layout seams by hand. They
     * are Node CommonJS, not app code, nothing imports them and Playwright is
     * not a dependency — so they fail the app's TypeScript rules for reasons
     * that say nothing about the app. Linting them only ever produced noise
     * that trained everyone to ignore a failing `npm run lint`.
     */
    "_ux_*.js",
  ]),
]);

export default eslintConfig;
