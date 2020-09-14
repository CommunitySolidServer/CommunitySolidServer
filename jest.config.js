module.exports = {
  "globals": {
    "ts-jest": {
      "tsConfig": "tsconfig.json"
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
    "/node_modules/",
    "/src/init/CliRunner.ts"
  ],
  "coverageThreshold": {
    "./src": {
      "branches": 100,
      "functions": 100,
      "lines": 100,
      "statements": 100
    }
  }
};
