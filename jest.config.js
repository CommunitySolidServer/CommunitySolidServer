module.exports = {
  "globals": {
    "ts-jest": {
      "tsConfig": "tsconfig.json"
    }
  },
  "transform": {
    "^.+\\.ts$": "ts-jest"
  },
  "testRegex": "/test/.*\\.ts$",
  "moduleFileExtensions": [
    "ts",
    "js"
  ],
  "testEnvironment": "node",
  "collectCoverage": true,
  // either we don't build the test files (but then eslint needs a separate tsconfig) or we do this
  "testPathIgnorePatterns": [
    ".*\\.d\\.ts"
  ],
  "coveragePathIgnorePatterns": [
    "/node_modules/"
  ]
};
