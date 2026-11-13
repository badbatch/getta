import { createGenerateOperations } from '#generator/helpers/createGenerateOperations.ts';
import { generateClientSource } from '#generator/helpers/generateClientSource.ts';
import { generateOperationTypes } from '#generator/helpers/generateOperationTypes.ts';
import { isOpenApiDocument } from '#generator/helpers/isOpenApiDocument.ts';

export const generateOpenApiClient = (
  input: unknown,
  clientName = 'createApiClient',
  typesImportPath = './types.ts',
): string => {
  if (!isOpenApiDocument(input)) {
    throw new Error('Expected an OpenAPI 3.x document.');
  }

  const { paths = {} } = input;
  const generateOperations = createGenerateOperations(input);
  const { availableOperations, operations, requiredHelpers } = generateOperations(paths);
  const operationTypes = generateOperationTypes(availableOperations, operations);
  return generateClientSource(clientName, typesImportPath, operationTypes, operations, requiredHelpers);
};
