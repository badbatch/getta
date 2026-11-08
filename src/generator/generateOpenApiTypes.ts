import openapiTS, { astToString } from 'openapi-typescript';
import { isOpenApiDocument } from '#generator/helpers/isOpenApiDocument.ts';

export const generateOpenApiTypes = async (input: unknown): Promise<string> => {
  if (!isOpenApiDocument(input)) {
    throw new Error('Expected an OpenAPI 3.x document.');
  }

  const ast = await openapiTS(input);
  return astToString(ast);
};
