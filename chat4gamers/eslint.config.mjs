// eslint.config.mjs (root)
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import prettierConfig from 'eslint-config-prettier'

export default tseslint.config(
  // Base JS rules
  js.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.recommended,

  // React + hooks
  {
    plugins: {
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },

  // Your custom rules
  {
    rules: {
      // TypeScript
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // React
      'react/react-in-jsx-scope': 'off', // not needed in React 17+
      'react/prop-types': 'off',         // TypeScript handles this

      // Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'off',

      // General
      'no-console': ['warn', {allow: ['warn', 'error']}],
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Files to ignore
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/out/**',
      '**/build/**',
      '**/*.config.js',
      '**/*.config.ts',
    ],
  },

  // Disable formatting rules — let Prettier handle those
  prettierConfig,
)