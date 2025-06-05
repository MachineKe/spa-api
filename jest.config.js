module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'ts'],
  testMatch: ['**/__tests__/**/*.test.(ts|js)'],
  setupFilesAfterEnv: [],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/']
};
