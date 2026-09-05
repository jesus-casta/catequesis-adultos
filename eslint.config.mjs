export default [
  { ignores: ['node_modules/**', 'dist/**', 'vendor/**', '.sites-runtime/**', '.wrangler/**'] },
  {
    files: ['frontend/**/*.{js,jsx}', 'backend/**/*.js', 'tests/**/*.mjs'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    rules: {
      'constructor-super': 'error', 'for-direction': 'error', 'getter-return': 'error',
      'no-async-promise-executor': 'error', 'no-constant-binary-expression': 'error',
      'no-dupe-args': 'error', 'no-dupe-keys': 'error', 'no-duplicate-case': 'error',
      'no-invalid-regexp': 'error', 'no-unexpected-multiline': 'error',
      'no-unreachable': 'error', 'no-unsafe-finally': 'error', 'valid-typeof': 'error'
    }
  }
];
