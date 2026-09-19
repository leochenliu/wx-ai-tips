// ESLint v9 flat config — 直接组合插件，避开 eslint-config-next 的 @rushstack/eslint-patch 兼容层
// eslint-config-next 15.x 还在用 CJS + rushstack patch，ESLint 9 的 flat config 报
// "Failed to patch ESLint because the calling module was not recognized"。
// 推荐用法（Next.js 16 也会移除 next lint）：直接用 @next/eslint-plugin-next。

import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";

// Node.js 全局（脚本和配置文件用）
const nodeGlobals = {
  process: "readonly",
  console: "readonly",
  Buffer: "readonly",
  __dirname: "readonly",
  __filename: "readonly",
  global: "readonly",
  require: "readonly",
  module: "readonly",
  exports: "writable",
};

// 浏览器全局（Next.js 客户端用）
const browserGlobals = {
  window: "readonly",
  document: "readonly",
  navigator: "readonly",
  fetch: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  HTMLElement: "readonly",
  HTMLInputElement: "readonly",
};

export default [
  // 全局忽略
  {
    ignores: [
      ".next/",
      "node_modules/",
      "dist/",
      "out/",
      "backups/",
      "**/*.config.js",
      "**/*.config.mjs",
      "**/*.config.ts",
      "next-env.d.ts",
    ],
  },

  // JS 基线
  js.configs.recommended,

  // TS / TSX / JS / JSX 项目代码
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: { ...nodeGlobals, ...browserGlobals },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "@next/next": nextPlugin,
      "react": reactPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": jsxA11yPlugin,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      // Next.js 推荐 + Core Web Vitals
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      // TypeScript
      ...tsPlugin.configs.recommended.rules,
      // React
      ...reactPlugin.configs.recommended.rules,
      "react/prop-types": "off", // TypeScript 替代
      "react/react-in-jsx-scope": "off", // React 17+ 用 new JSX transform
      // React Hooks
      ...reactHooksPlugin.configs.recommended.rules,
      // a11y
      ...jsxA11yPlugin.configs.recommended.rules,
      // 项目自定义
      "no-undef": "off", // TypeScript 已经做 undef 检查
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/triple-slash-reference": "off", // next-env.d.ts 用
      "react/no-unescaped-entities": "off",
      "prefer-const": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },

  // Node 脚本（scripts/）— console 是必要的，关 no-console
  {
    files: ["scripts/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
];