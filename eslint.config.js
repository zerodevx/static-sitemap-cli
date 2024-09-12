import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

/** @type {import('eslint').Linter.Config[]} */
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
