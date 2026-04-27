// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    rules: {
      // Avoid false positives for module resolution in React Native/Expo packages.
      'import/no-unresolved': 'off',
    },
  },
]);
