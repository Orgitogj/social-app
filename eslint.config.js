const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/**', 'coverage/**', '.history/**', 'supabase/functions/**', 'types/database.ts'] },
  { rules: { '@typescript-eslint/no-explicit-any': 'off', '@typescript-eslint/no-unused-vars': 'off', 'react-hooks/exhaustive-deps': 'off', 'import/no-duplicates': 'off' } },
]);
