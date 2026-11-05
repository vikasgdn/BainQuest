module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: ['node_modules/', 'android/', 'ios/', 'coverage/'],
  overrides: [
    {
      files: ['src/domain/**/*.{ts,tsx}', 'src/shared/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              'react',
              'react-native',
              'react-native-*',
              '@react-native/*',
              '@react-navigation/*',
              '@/app/*',
              '@/features/*',
              '@/infrastructure/*',
              '@/design-system/*',
              '**/app/**',
              '**/features/**',
              '**/infrastructure/**',
              '**/design-system/**',
            ],
          },
        ],
      },
    },
    {
      files: ['src/features/**/*.{ts,tsx}', 'src/design-system/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              '@/infrastructure/*',
              '**/infrastructure/**',
              '@/app/*',
              '**/app/**',
              'react-native-mmkv',
              '*sqlite*',
            ],
          },
        ],
      },
    },
    {
      files: ['src/infrastructure/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              '@/app/*',
              '@/features/*',
              '@/design-system/*',
              '**/app/**',
              '**/features/**',
              '**/design-system/**',
            ],
          },
        ],
      },
    },
  ],
};
