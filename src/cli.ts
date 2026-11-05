import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as generateOpenApiCommand from './cli/command.ts';

export const runGettaCli = async (): Promise<void> => {
  await yargs(hideBin(process.argv))
    .scriptName('getta')
    .command(generateOpenApiCommand)
    .demandCommand(1, 'Choose a command to run.')
    .strict()
    .help()
    .parseAsync();
};
