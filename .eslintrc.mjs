import js from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            globals: {
                ...globals.browser,
            }
        },
        files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
        rules: {
            quotes: ['warn', 'single'],
        },
    },
];
