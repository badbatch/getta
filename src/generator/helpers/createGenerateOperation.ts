import { type OpenAPI3, type OperationObject, type PathItemObject } from 'openapi-typescript';
import { isString } from 'remeda';
import { buildOperationNameFromMethodAndPath } from '#generator/helpers/buildOperationNameFromMethodAndPath.ts';
import { createGetOperationParameters } from '#generator/helpers/createGetOperationParameters.ts';
import { createGetRequestBodyContentType } from '#generator/helpers/createGetRequestBodyContentType.ts';
import { getUniqueOperationName } from '#generator/helpers/getUniqueOperationName.ts';
import { renderOperation } from '#generator/helpers/renderOperation.ts';
import { renderOperationOptions } from '#generator/helpers/renderOperationOptions.ts';
import { renderOperationPath } from '#generator/helpers/renderOperationPath.ts';
import { renderOperationRequest } from '#generator/helpers/renderOperationRequest.ts';
import { renderPathParameters } from '#generator/helpers/renderPathParameters.ts';
import { sanitiseOperationId } from '#generator/helpers/sanitiseOperationId.ts';
import { type HttpMethod } from '#types.ts';

export const createGenerateOperation = (document: OpenAPI3) => {
  const getOperationParameters = createGetOperationParameters(document);
  const getRequestBodyContentType = createGetRequestBodyContentType(document);

  return (
    path: string,
    method: HttpMethod,
    pathItem: PathItemObject,
    operation: OperationObject,
    usedOperationNames: Set<string>,
    index: number,
  ): string => {
    const baseOperationName =
      isString(operation.operationId) && operation.operationId.length > 0
        ? sanitiseOperationId(operation.operationId)
        : buildOperationNameFromMethodAndPath(method, path);

    const operationName = getUniqueOperationName(baseOperationName, usedOperationNames);

    const operationParameters = getOperationParameters(pathItem, operation);
    const pathParameters = operationParameters.filter(parameter => parameter.in === 'path');
    const hasQueryParameters = operationParameters.some(parameter => parameter.in === 'query');
    const requestBodyContentType = getRequestBodyContentType(operation, path, method);

    const operationType = `__Operation${String(index)}`;
    const renderedPathParameters = renderPathParameters(pathParameters, operationType);
    const renderedOperationOptions = renderOperationOptions(operationType, hasQueryParameters, requestBodyContentType);
    const renderedOperationPath = renderOperationPath(path, renderedPathParameters);
    const renderedOperationRequest = renderOperationRequest(hasQueryParameters, method, requestBodyContentType);

    return renderOperation({
      operationName,
      operationType,
      parameters: [...renderedPathParameters.declarations, renderedOperationOptions.declarations],
      pathDeclarations: renderedOperationPath.declarations,
      pathExpression: renderedOperationPath.expression,
      requestDeclarations: renderedOperationRequest.declarations,
      requestExpression: renderedOperationRequest.expression,
    });
  };
};
