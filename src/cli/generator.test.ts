import { describe, expect, it } from '@jest/globals';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as ts from 'typescript';
import { generateOpenApiClient } from './generator.ts';

describe('generateOpenApiClient', () => {
  it('When given operations and component schemas, then it generates typed methods that use Getta', () => {
    // Arrange
    const document = {
      components: {
        schemas: {
          Product: { properties: { name: { type: 'string' } }, type: 'object' },
        },
      },
      openapi: '3.0.3',
      paths: {
        '/products/{productId}': {
          get: {
            operationId: 'getProduct',
            parameters: [
              {
                in: 'path',
                name: 'productId',
                required: true,
                schema: { type: 'string' },
              },
              {
                in: 'query',
                name: 'includeDetails',
                schema: { type: 'boolean' },
              },
            ],
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Product' },
                  },
                },
              },
            },
          },
        },
      },
    };

    // Act
    const generated = generateOpenApiClient(document);

    // Assert
    // The snapshot contains an OpenAPI path placeholder that resembles template interpolation.
    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- OpenAPI placeholders use braces literally. */
    expect(generated).toMatchInlineSnapshot(`
      "import { type Getta } from 'getta';
      import { type FetchResponse } from 'getta';

      export type Product = {
        "name"?: string;
      };

      export const createApiClient = (client: Getta) => ({
        getProduct: (productId: string, options?: {
        query?: {
          "includeDetails"?: boolean;
        };
      }) => {
          const pathParameters = { "productId": productId };
          const path = "/products/{productId}".replace(/\\{([^}]+)\\}/gu, (_match, name: string) => encodeURIComponent(String(pathParameters[name as keyof typeof pathParameters])));
          return client.get(path, {
            
            queryParams: Object.fromEntries(Object.entries(options?.query ?? {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : String(value)])),
            headers: {},
            
          }) as Promise<FetchResponse<Product>>;
        },
      });
      "
    `);
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
  });

  it('When generated path methods are called, then it type-checks positional parameters', async () => {
    // Arrange
    const directory = await mkdtemp(join(tmpdir(), 'getta-generator-'));

    const document = {
      openapi: '3.0.3',
      paths: {
        '/products/{productId}': {
          get: {
            operationId: 'getProduct',
            parameters: [
              {
                in: 'path',
                name: 'productId',
                required: true,
                schema: { type: 'string' },
              },
            ],
            responses: { '200': { description: 'OK' } },
          },
        },
      },
    };

    const generatedPath = join(directory, 'generated.ts');
    const usagePath = join(directory, 'usage.ts');
    const gettaTypesPath = join(directory, 'getta.d.ts');

    try {
      await writeFile(generatedPath, generateOpenApiClient(document));

      await writeFile(
        usagePath,
        [
          "import { createApiClient } from './generated';",
          "declare const client: import('getta').Getta;",
          'const getta = createApiClient(client);',
          "void getta.getProduct('123');",
          '// @ts-expect-error A product ID is required.',
          'void getta.getProduct();',
          '',
        ].join('\n'),
      );

      await writeFile(
        gettaTypesPath,
        [
          "declare module 'getta' {",
          '  export interface Getta {',
          '    get(path: string, options?: { headers?: Record<string, string>; queryParams?: Record<string, string> }): Promise<FetchResponse>;',
          '  }',
          '  export interface FetchResponse<T = unknown> { data: T; }',
          '}',
          '',
        ].join('\n'),
      );

      // Act
      const program = ts.createProgram([generatedPath, usagePath, gettaTypesPath], {
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        noEmit: true,
        strict: true,
        target: ts.ScriptTarget.ES2022,
      });

      const diagnostics = ts
        .getPreEmitDiagnostics(program)
        .map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));

      // Assert
      expect(diagnostics).toEqual([]);
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });

  it('When an operation has a request body, then it generates a typed JSON body argument', () => {
    // Arrange
    const document = {
      openapi: '3.1.0',
      paths: {
        '/products': {
          post: {
            operationId: 'createProduct',
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    properties: { name: { type: 'string' } },
                    required: ['name'],
                    type: 'object',
                  },
                },
              },
              required: true,
            },
            responses: { '201': { description: 'Created' } },
          },
        },
      },
    };

    // Act
    const generated = generateOpenApiClient(document);

    // Assert
    expect(generated).toMatchInlineSnapshot(`
      "import { type Getta } from 'getta';
      import { type FetchResponse } from 'getta';

      export const createApiClient = (client: Getta) => ({
        createProduct: (options: {
        body: {
        "name": string;
      };
      }) => {
          const path = "/products";
          return client.request(path, {
            method: "post",
            queryParams: {},
            headers: {},
            body: options?.body === undefined ? undefined : JSON.stringify(options.body),
          }) as Promise<FetchResponse<unknown>>;
        },
      });
      "
    `);
  });

  it('When the document is not OpenAPI 3.x, then it throws a useful error', () => {
    // Arrange
    const document = { openapi: '2.0', paths: {} };

    // Act
    const generate = () => generateOpenApiClient(document);

    // Assert
    expect(generate).toThrow('Expected an OpenAPI 3.x document.');
  });
});
