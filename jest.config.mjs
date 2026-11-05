import jestConfig from '@repodog/jest-config';
import swcConfig from '@repodog/swc-config';

// Required by Jest
// eslint-disable-next-line import-x/no-default-export
export default {
  ...jestConfig({ compilerOptions: swcConfig }),
  setupFilesAfterEnv: ['./node_modules/fetch-mocked/testSetup.mjs'],
};
