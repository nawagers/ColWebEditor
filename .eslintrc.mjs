import js from '@eslint/js';
import globals from "globals";

export default [
    js.configs.recommended,
    {
        languageOptions: {
            globals: {
                ...globals.browser,
            }
        },
        files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
        rules: {
            quotes: ['warn', 'single'],
        },
    },
];
var MAX_CHARS = 120;
var SPACES_PER_TAB = 4;

// module.exports = {
