module.exports = {
  preset: 'react-scripts',
  transformIgnorePatterns: [
    'node_modules/(?!(fast-check)/)',
  ],
  moduleNameMapper: {
    '^fast-check$': '<rootDir>/node_modules/fast-check/lib/fast-check.js',
  },
  testEnvironment: 'jsdom',
};
