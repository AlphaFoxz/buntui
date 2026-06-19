import type {FlatXoConfig} from 'xo';

/**
 * @see {@link 'file://./node_modules/eslint-config-xo-typescript/index.js'}
 */
const expose: FlatXoConfig = [
  {
    ignores: [
      '**/*.test.ts',
      '**/*.vue',
      '**/*.md',
      '**/*.html',
      '**/dist/**',
      '**/scripts/**',
      'designs/**',
      'packages/cli/templates/**',
      // 'packages/create-buntui/templates/**',
      'packages/github-pages/**',
      'xo.config.ts',
    ],
  },
  {
    rules: {
      // ===== Project conventions =====
      'no-restricted-globals': [
        'error',
        {
          name: 'DataView',
          message: 'Please use `TuiDataViewWrapper` instead.',
        },
      ],
      '@typescript-eslint/no-restricted-types': [
        'error',
        {
          types: {
            object: {
              message: 'The `object` type is hard to use. Use `Record<string, unknown>` instead. See: https://github.com/typescript-eslint/typescript-eslint/pull/848',
              fixWith: 'Record<string, unknown>',
            },
            // Null: {
            // 	message: 'Use `undefined` instead. See: https://github.com/sindresorhus/meta/issues/7',
            // 	fixWith: 'undefined',
            // },
            Buffer: {
              message: 'Use Uint8Array instead. See: https://sindresorhus.com/blog/goodbye-nodejs-buffer',
              suggest: ['Uint8Array'],
            },
            '[]': 'Don\'t use the empty array type `[]`. It only allows empty arrays. Use `SomeType[]` instead.',
            '[[]]': 'Don\'t use `[[]]`. It only allows an array with a single element which is an empty array. Use `SomeType[][]` instead.',
            '[[[]]]': 'Don\'t use `[[[]]]`. Use `SomeType[][][]` instead.',
            '[[[[]]]]': 'ur drunk 🤝',
            '[[[[[]]]]]': '🦄💥',
          },
        },
      ],

      // ===== @typescript-eslint =====
      '@typescript-eslint/class-literal-property-style': 'off',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variable',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
      ],
      '@typescript-eslint/no-redeclare': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-unused-private-class-members': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_'},
      ],
      '@typescript-eslint/strict-boolean-expressions': [
        'error',
        {
          allowString: true,
          allowNumber: true,
          allowNullableObject: true,
          allowNullableString: true,
          allowNullableNumber: true,
          allowNullableEnum: true,
          allowNullableBoolean: false,
          allowAny: false,
        },
      ],
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        {requireDefaultForNonUnion: true},
      ],

      // ===== @stylistic =====
      '@stylistic/indent': ['error', 2],
      '@stylistic/indent-binary-ops': ['error', 2],

      // ===== unicorn =====
      'unicorn/consistent-class-member-order': [
        'error',
        {
          order: [
            'static-field',
            'static-block',
            'static-method',
            'public-field',
            'private-field',
            'constructor',
            'public-method',
            'private-method',
          ],
        },
      ],
      'unicorn/filename-case': [
        'error',
        {cases: {kebabCase: true, camelCase: true, pascalCase: true}},
      ],
      'unicorn/no-break-in-nested-loop': 'off',
      'unicorn/prefer-math-trunc': 'off',
      'unicorn/prefer-number-coercion': 'off',
      'unicorn/require-module-specifiers': 'off',
      'unicorn/text-encoding-identifier-case': 'off',

      // ===== import-x =====
      'import-x/extensions': 'off',

      // ===== ESLint core =====
      'complexity': ['error', {max: 35}],
      'max-params': ['error', {max: 6}],
      'no-bitwise': 'off',
      'no-useless-call': 'off',
    },
  },
  {
    files: ['packages/cli/src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-type-assertion': 'off',
      'import-x/no-unassigned-import': 'off',
      'import-x/order': 'off',
      'require-unicode-regexp': 'off',
      'unicorn/no-process-exit': 'off',
    },
  },
  {
    files: ['packages/create-buntui/src/**/*.ts'],
    rules: {
      'unicorn/no-process-exit': 'off',
    },
  },
  {
    files: ['packages/create-buntui/templates/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-type-assertion': 'off',
      'unicorn/no-await-expression-member': 'off',
    },
  },
];

export default expose;
