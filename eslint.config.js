const globals = require("globals");
const js = require("@eslint/js");
const prettier = require("eslint-plugin-prettier/recommended");

module.exports = [
  js.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
  },
];
