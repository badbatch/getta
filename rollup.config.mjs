import rollupConfig from '@repodog/rollup-config';
import swcConfig from '@repodog/swc-config';
import swcPlugin from '@rollup/plugin-swc';

const config = rollupConfig({ compiler: swcPlugin({ swc: swcConfig.ts }) });
const { input, ...rest } = config;

// rollup requires default export
// eslint-disable-next-line import-x/no-default-export
export default [
  config,
  {
    ...rest,
    input: input.replace('index', 'cli'),
  },
];
