import js from "@eslint/js";
export default [
    js.configs.recommended,
    {
        env: {
            browser: true,
        },
        rules: {
            quotes: ["error", "double"],
        },
    },
];
