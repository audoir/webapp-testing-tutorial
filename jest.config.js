const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Path to your Next.js app — loads next.config.js and .env files
  dir: './',
});

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/', '<rootDir>/tests/'],
};

module.exports = createJestConfig(config);
