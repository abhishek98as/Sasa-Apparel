import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

const config: Config = {
  displayName: 'Sasa Apparel Portal Tests',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '<rootDir>/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/tests/**/*.test.{ts,tsx}',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/types.ts',
  ],
  // Skip integration tests that require live MongoDB connection
  // These tests use direct MongoDB imports which cause ESM issues in Jest
  // Run them manually with: npx tsx <test-file>
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/__tests__/integration.test.ts',
    '<rootDir>/__tests__/database.test.ts',
    '<rootDir>/__tests__/api.test.ts',
    '<rootDir>/__tests__/auth.test.ts',
    '<rootDir>/tests/db-connection.test.ts',
    '<rootDir>/tests/auth.test.ts',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(bson|mongodb|@mongodb-js)/)',
  ],
};

export default createJestConfig(config);
