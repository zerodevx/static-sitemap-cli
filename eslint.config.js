import globals from 'globals'
import js from '@eslint/js'
import prettier from 'eslint-config-prettier'

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  js.configs.recommended,
  prettier,
  {
    languageOptions: {
      globals: globals.node
    },
    rules: {
      'no-tabs': 'error',
      'no-unexpected-multiline': 'error'
    }
  }
]
