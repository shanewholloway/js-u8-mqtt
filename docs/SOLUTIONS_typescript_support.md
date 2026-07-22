module.exports = {
    root: true,
    parser: "@typescript-eslint/parser", // Use the TS parser
    plugins: [
        "@typescript-eslint"            // Access type-aware rules and plugins
    ],
    extends: [
        "eslint:recommended",           // Base recommended JS rules
        "plugin:@typescript-eslint/recommended", // Add TypeScript-specific best practices
        "prettier/@typescript-eslint"  // Ensure Prettier (formatter) doesn't conflict with TS rules
    ],
    parserOptions: {
        ecmaVersion: 2020,             // Target JS version for ESLint checks
        sourceType: "module",          // Treat files as modules (import/export)
        project: "./tsconfig.json"    // Crucial: Point the linter to the tsconfig file
    },
    rules: {
        // Custom rules can be added here, e.g., forcing explicit types on props
    }
};