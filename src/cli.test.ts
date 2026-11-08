import { afterEach, describe, expect, it } from '@jest/globals';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runGettaCli } from './cli.ts';

describe('runGettaCli', () => {
  let directory: string | undefined;
  let originalWorkingDirectory: string | undefined;
  let originalArguments: string[] | undefined;

  afterEach(async () => {
    if (originalArguments) {
      process.argv = originalArguments;
      originalArguments = undefined;
    }

    if (originalWorkingDirectory) {
      process.chdir(originalWorkingDirectory);
      originalWorkingDirectory = undefined;
    }

    if (directory) {
      await rm(directory, { force: true, recursive: true });
      directory = undefined;
    }
  });

  it('When invoked with generate-client arguments, then it runs the command and writes the client', async () => {
    // Arrange
    directory = await mkdtemp(join(tmpdir(), 'getta-cli-'));
    originalWorkingDirectory = process.cwd();
    originalArguments = process.argv;
    process.chdir(directory);
    await writeFile('spec.json', JSON.stringify({ openapi: '3.0.0', paths: {} }));
    process.argv = ['node', 'getta', 'generate-client', 'spec.json', 'generated'];

    // Act
    await runGettaCli();
    const contents = await readFile('generated/client.ts', 'utf8');

    // Assert
    expect(contents).toContain('export const createApiClient');
  });
});
