import { type OpenAPI3, type OperationObject, type PathItemObject, type PathsObject } from 'openapi-typescript';
import { HTTP_METHODS } from '#constants.ts';
import { createGenerateOperation } from '#generator/helpers/createGenerateOperation.ts';
import { resolveReference } from '#generator/helpers/resolveReference.ts';

export type AvailableOperation = {
  method: string;
  path: string;
};

export type GenerateOperationsResult = {
  availableOperations: AvailableOperation[];
  operations: string[];
};

export const createGenerateOperations = (document: OpenAPI3) => {
  const generateOperation = createGenerateOperation(document);

  return (paths: PathsObject): GenerateOperationsResult => {
    const availableOperations: AvailableOperation[] = [];
    const usedOperationNames = new Set<string>();
    let operationIndex = 0;

    const operations = Object.entries(paths).flatMap(([path, pathItem]): string[] => {
      const resolvedPathItem = resolveReference<PathItemObject>(document, pathItem);

      return HTTP_METHODS.flatMap(method => {
        const operation = resolvedPathItem[method];

        if (!operation) {
          return [];
        }

        const resolvedOperation = resolveReference<OperationObject>(document, operation);
        const index = operationIndex++;
        availableOperations.push({ method, path });
        return [generateOperation(path, method, resolvedPathItem, resolvedOperation, usedOperationNames, index)];
      });
    });

    return { availableOperations, operations };
  };
};
