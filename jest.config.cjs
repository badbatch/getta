const config = require('@repodog/jest-config');

module.exports = {
  ...config,
  setupFilesAfterEnv: ['fetch-mocked/testSetup.mjs'],
};
