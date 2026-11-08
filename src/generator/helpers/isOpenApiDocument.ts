import { type OpenAPI3 } from 'openapi-typescript';
import { isPlainObject } from 'remeda';

export const isOpenApiDocument = (value: unknown): value is OpenAPI3 =>
  isPlainObject(value) && typeof value.openapi === 'string' && value.openapi.startsWith('3.');
