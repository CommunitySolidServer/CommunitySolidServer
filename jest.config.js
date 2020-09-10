module.exports = {
  "globals": {
    "ts-jest": {
      "tsConfig": "tsconfig.json",
    }
  },
  "transform": {
    "^.+\\.ts$": "ts-jest"
  },
  "testRegex": "/test/.*\\.test\\.ts$",
  "moduleFileExtensions": [
    "ts",
    "js"
  ],
  "testEnvironment": "node",
  "setupFilesAfterEnv": ["jest-rdf"],
  "collectCoverage": true,
  "coveragePathIgnorePatterns": [
    "/node_modules/"
  ],
  "coverageThreshold": {
    "./src": {
      "branches": 97,
      "functions": 97,
      "lines": 97,
      "statements": 97
    }
  },
  "globalTeardown": "<rootDir>/test/teardown.ts"
};
