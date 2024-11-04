const jestConfig = require('@repodog/jest-config');
const swcConfig = require('@repodog/swc-config');

module.exports = {
  ...jestConfig({ compilerOptions: swcConfig }),
  setupFilesAfterEnv: ['./node_modules/fetch-mocked/testSetup.mjs'],
};
