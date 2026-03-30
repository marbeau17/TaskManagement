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
    "scripts/**",
  ]),
  {
    rules: {
      // Allow `any` for data layer interop with Supabase untyped responses
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow unused vars prefixed with _
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // setState in effects is needed for sync patterns (e.g., reset on prop change)
      "react-hooks/set-state-in-effect": "warn",
      // Refs during render used for scroll-to-today pattern
      "react-hooks/refs": "warn",
      // Allow require in scripts
      "@typescript-eslint/no-require-imports": "warn",
      // Allow window.location mutations for navigation
      "react-hooks/immutability": "warn",
      // Incompatible library warnings (react-hook-form)
      "react-hooks/incompatible-library": "warn",
      // prefer-const
      "prefer-const": "warn",
    },
  },
]);

export default eslintConfig;
