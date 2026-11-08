import { load } from 'js-yaml';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { format } from 'prettier';
import { generateOpenApiClient } from '#generator/generateOpenApiClient.ts';
import { generateOpenApiTypes } from '#generator/generateOpenApiTypes.ts';

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
  const clientOutputPath = resolve(outputPath, 'client.ts');
  const typesOutputPath = resolve(outputPath, 'types.ts');

  const clientContents = await format(generateOpenApiClient(document, name), {
    filepath: clientOutputPath,
  });

  const typesContents = await format(await generateOpenApiTypes(document), {
    filepath: typesOutputPath,
  });

  await mkdir(outputPath, { recursive: true });
  await writeFile(clientOutputPath, clientContents, 'utf8');
  await writeFile(typesOutputPath, typesContents, 'utf8');

  process.stdout.write(`Generated ${relative(process.cwd(), outputPath)}\n`);
};
