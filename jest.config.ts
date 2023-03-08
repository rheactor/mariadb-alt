export const jestConfig = (sourcePath = "src") => ({
  moduleNameMapper: {
    "^@/(.*)$": `<rootDir>/${sourcePath}/$1`,
    "^@Tests/(.*)$": "<rootDir>/tests/$1",
  },
  setupFiles: ["dotenv/config"],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
});

export default jestConfig();
