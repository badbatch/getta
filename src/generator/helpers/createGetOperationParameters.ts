import { type OpenAPI3, type OperationObject, type ParameterObject, type PathItemObject } from 'openapi-typescript';
import { resolveReference } from '#generator/helpers/resolveReference.ts';

export const createGetOperationParameters =
  (document: OpenAPI3) =>
  (pathItem: PathItemObject, operation: OperationObject): ParameterObject[] => {
    const rawParameters = [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])].map(value =>
      resolveReference<ParameterObject>(document, value),
    );

    const parameters = new Map<string, ParameterObject>();

    for (const parameter of rawParameters) {
      parameters.set(`${parameter.in}:${parameter.name}`, parameter);
    }

    return parameters.values().toArray();
  };
