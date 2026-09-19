// ESLint v9 flat config
import next from "eslint-config-next";

export default [
  ...next(),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "off",
      "prefer-const": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }]
    }
  },
  {
    ignores: [".next/", "node_modules/", "dist/", "out/", "backups/"]
  }
];