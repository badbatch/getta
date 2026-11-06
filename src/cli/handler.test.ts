import { afterEach, describe, expect, it } from '@jest/globals';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { handler } from './handler.ts';

describe('generate-client handler', () => {
  let directory: string | undefined;
  let originalWorkingDirectory: string | undefined;

  afterEach(async () => {
    if (originalWorkingDirectory) {
      process.chdir(originalWorkingDirectory);
      originalWorkingDirectory = undefined;
    }

    if (directory) {
      await rm(directory, { force: true, recursive: true });
      directory = undefined;
    }
  });

  it('When called with an OpenAPI YAML spec and output path, then it writes a generated client module', async () => {
    // Arrange
    directory = await mkdtemp(join(tmpdir(), 'getta-cli-'));
    originalWorkingDirectory = process.cwd();
    process.chdir(directory);

    await writeFile(
      'openapi.yaml',
      [
        'openapi: 3.0.3',
        'paths:',
        '  /products:',
        '    get:',
        '      operationId: getProducts',
        '      responses:',
        '        "200":',
        '          description: OK',
        '',
      ].join('\n'),
    );

    const args = { name: 'createProductsApi', output: 'src/api.generated.ts', schema: 'openapi.yaml' };

    // Act
    await handler(args);
    const generated = await readFile(args.output, 'utf8');

    // Assert
    expect(generated).toContain('export const createProductsApi');
    expect(generated).toContain('getProducts:');
  });

  it('When called again with an unchanged spec, then it preserves the generated content', async () => {
    // Arrange
    directory = await mkdtemp(join(tmpdir(), 'getta-cli-'));
    originalWorkingDirectory = process.cwd();
    process.chdir(directory);
    await writeFile('openapi.json', JSON.stringify({ openapi: '3.0.0', paths: {} }));
    const args = { name: 'createApiClient', output: 'api.generated.ts', schema: 'openapi.json' };
    await handler(args);
    const firstContents = await readFile(args.output, 'utf8');

    // Act
    await handler(args);
    const secondContents = await readFile(args.output, 'utf8');

    // Assert
    expect(secondContents).toBe(firstContents);
  });
});
