const { createDefaultPreset } = require("ts-jest");

const tsJestPreset = createDefaultPreset();

/** @type {import("jest").Config} **/
module.exports = {
  ...tsJestPreset,
  testEnvironment: "node",
  setupFiles: ["<rootDir>/tests/jest.setup.ts"],
};