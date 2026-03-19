import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";

export default [
  {
    files: ["packages/*/src/**/*.{js,jsx}"],
    ignores: ["**/node_modules/**", "**/dist/**", "**/build/**"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "warn"
    }
  },
  {
    files: ["packages/*/src/**/*.{ts,tsx}"],
    ignores: ["**/node_modules/**", "**/dist/**", "**/build/**"],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        },
        project: ["./packages/*/tsconfig.json"]
      }
    },
    plugins: {
      "@typescript-eslint": typescriptEslint
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "no-console": "warn"
    }
  }
];