import jestConfig from '@repodog/jest-config';
import swcConfig from '@repodog/swc-config';

const { setupFilesAfterEnv, ...otherConfig } = jestConfig({ compilerOptions: swcConfig });

// Required by Jest
// eslint-disable-next-line import-x/no-default-export
export default {
  ...otherConfig,
  setupFilesAfterEnv: [...setupFilesAfterEnv, './node_modules/fetch-mocked/testSetup.mjs'],
};
