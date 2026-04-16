// Flat config (ESLint 9+). Lint TypeScript sources + JS scripts.
const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");

module.exports = [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "lib/compiler/**/*.js",
      "scripts/*.js",
      "bin/bridge.js",
      "hooks/**",
    ],
  },
  {
    files: ["lib/**/*.ts", "test/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
    },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": "off",
      "no-constant-condition": ["error", { checkLoops: false }],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "prefer-const": "error",
    },
  },
  {
    // Test fixtures often need `any` for loose mock shapes — not worth
    // inventing types we only use once.
    files: ["**/*.test.ts", "test/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
