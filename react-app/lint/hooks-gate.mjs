import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

// Gate de Rules of Hooks (rodado por `npm run lint:hooks`, encadeado no build).
// Previne a classe de bug que derrubou /comercial: hook chamado depois de early
// return -> "Rendered more hooks than during the previous render".
// Só rules-of-hooks como erro, pra não bloquear deploy por ruído de outras regras.
export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    // Gate só cuida de rules-of-hooks; não reclamar de disables de exhaustive-deps.
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
    },
  },
]
