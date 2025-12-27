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
  ]),
  {
    rules: {
      // Disable strict React purity rules for development
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      
      // Allow any types for development speed
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      
      // Allow unescaped quotes in JSX
      "react/no-unescaped-entities": "warn",
      
      // Allow require imports for certain files
      "@typescript-eslint/no-require-imports": "warn",
      
      // Prefer const but allow let
      "prefer-const": "warn"
    }
  }
]);

export default eslintConfig;
