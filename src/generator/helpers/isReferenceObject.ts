import { type ReferenceObject } from 'openapi-typescript';
import { isPlainObject } from 'remeda';

export const isReferenceObject = (value: unknown): value is ReferenceObject =>
  isPlainObject(value) && typeof value.$ref === 'string';
