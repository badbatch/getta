import { describe, expect, it } from '@jest/globals';
import yargs, { type Argv } from 'yargs';
import * as generateOpenApiCommand from './command.ts';

describe('generate-client command', () => {
  it('When help is requested, then it displays the command usage and options', async () => {
    // Arrange
    // @ts-expect-error not important in test
    const argv = generateOpenApiCommand.builder(yargs([])) as Argv;

    const parser = argv
      .scriptName('getta')
      .usage(`$0 ${generateOpenApiCommand.command}`, generateOpenApiCommand.describe)
      .help();

    // Act
    const help = await parser.getHelp();

    // Assert
    expect(help).toMatchInlineSnapshot(`
      "getta generate-client <schema> [output]

      Generate a typed Getta client from an OpenAPI 3.x document.

      Positionals:
        schema  OpenAPI 3.x JSON or YAML document.                            [string]
        output  TypeScript module to generate.  [string] [default: "api.generated.ts"]

      Options:
        --version  Show version number                                       [boolean]
        --name     Exported client factory name. [string] [default: "createApiClient"]
        --help     Show help                                                 [boolean]"
    `);
  });
});
