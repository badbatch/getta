const config = require('@repodog/jest-config');

module.exports = {
  ...config,
  setupFilesAfterEnv: ['./node_modules/fetch-mocked/testSetup.mjs'],
};
