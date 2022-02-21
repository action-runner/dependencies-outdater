/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/**/*.test.ts",
    "!src/**/*.stories.ts",
    "!src/**/main.ts",
    "!src/**/index.ts",
  ],
  testPathIgnorePatterns: [
    "src/*.js",
    "build/",
    "node_modules/",
  ]
};