import { load } from 'js-yaml';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { generateOpenApiClient } from './generator.ts';

const isMissingFile = (error: unknown): boolean =>
  !!error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT';

export interface GenerateOpenApiArguments {
  name: string;
  output: string;
  schema: string;
}

export const handler = async ({ name, output, schema }: GenerateOpenApiArguments): Promise<void> => {
  const schemaPath = resolve(process.cwd(), schema);
  const outputPath = resolve(process.cwd(), output);
  const source = await readFile(schemaPath, 'utf8');
  const isYaml = /\.ya?ml$/i.test(schemaPath);
  // JSON.parse returns any type
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const document = isYaml ? load(source) : (JSON.parse(source) as unknown);
  const contents = generateOpenApiClient(document, name);
  let existingContents: string | undefined;

  try {
    existingContents = await readFile(outputPath, 'utf8');
  } catch (error) {
    if (!isMissingFile(error)) {
      throw error;
    }
  }

  if (existingContents !== contents) {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, contents, 'utf8');
  }

  process.stdout.write(`Generated ${relative(process.cwd(), outputPath)}\n`);
};
