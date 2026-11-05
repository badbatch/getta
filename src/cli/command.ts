import { type CommandBuilder } from 'yargs';
import { type GenerateOpenApiArguments } from '#cli/handler.ts';

export const builder: CommandBuilder<object, GenerateOpenApiArguments> = yargs =>
  yargs
    .positional('schema', {
      demandOption: true,
      describe: 'OpenAPI 3.x JSON or YAML document.',
      type: 'string',
    })
    .positional('output', {
      default: 'api.generated.ts',
      describe: 'TypeScript module to generate.',
      type: 'string',
    })
    .option('name', {
      default: 'createApiClient',
      describe: 'Exported client factory name.',
      type: 'string',
    })
    .check(({ name }) => {
      if (!/^[A-Za-z_$][\w$]*$/u.test(name)) {
        throw new Error('--name must be a TypeScript identifier.');
      }

      return true;
    });

export const command = 'generate-openapi <schema> [output]';
export const describe = 'Generate a typed Getta client from an OpenAPI 3.x document.';
export { handler } from './handler.ts';
