import { type OpenAPI3, type OperationObject, type RequestBodyObject } from 'openapi-typescript';
import { resolveReference } from '#generator/helpers/resolveReference.ts';
import { type HttpMethod } from '#types.ts';

export type GetRequestBodyContentTypeResult = {
  contentType: 'json' | 'multipart';
  required: boolean;
};

export const createGetRequestBodyContentType =
  (document: OpenAPI3) =>
  (operation: OperationObject, path: string, method: HttpMethod): GetRequestBodyContentTypeResult | undefined => {
    const requestBody = operation.requestBody
      ? resolveReference<RequestBodyObject>(document, operation.requestBody)
      : undefined;

    const { content } = requestBody ?? {};

    if (!content) {
      return;
    }

    const mediaTypes = Object.keys(content);

    if (mediaTypes.length === 0) {
      return;
    }

    const isJsonMediaType = mediaTypes.some(type => type === 'application/json' || type.endsWith('+json'));

    if (isJsonMediaType) {
      return {
        contentType: 'json',
        required: requestBody?.required === true,
      };
    }

    const isMultipartMediaType = mediaTypes.includes('multipart/form-data');

    if (isMultipartMediaType) {
      return {
        contentType: 'multipart',
        required: requestBody?.required === true,
      };
    }

    throw new Error(
      `Unsupported request body content type for ${method.toUpperCase()} ${path}. ` +
        `Supported types: application/json and multipart/form-data. ` +
        `Received: ${mediaTypes.join(', ')}.`,
    );
  };
