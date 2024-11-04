import js from '@eslint/js';
export default [
    js.configs.recommended,
    {
        env: {
            browser: true,
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

//     'env': {
//         'browser': true,

//     },
//     'files': ["**/*.js", "**/*.cjs", "**/*.mjs"],
//     'rules': {
//         'quotes': ['warn', 'single'],
//     },
// };