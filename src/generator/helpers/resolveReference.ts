import { type OpenAPI3, type ReferenceObject } from 'openapi-typescript';
import { isPlainObject } from 'remeda';
import { isReferenceObject } from '#generator/helpers/isReferenceObject.ts';

export const resolveReference = <T>(document: OpenAPI3, value: T | ReferenceObject): T => {
  if (!isReferenceObject(value)) {
    return value;
  }

  const ref = value.$ref;

  if (!ref.startsWith('#/')) {
    throw new Error(`Unsupported reference: ${ref}`);
  }

  const segments = ref
    .slice(2)
    .split('/')
    .map(segment => segment.replaceAll('~1', '/').replaceAll('~0', '~'));

  let current: unknown = document;

  for (const segment of segments) {
    if (!isPlainObject(current) || !Object.hasOwn(current, segment)) {
      throw new Error(`Unable to resolve reference: ${ref}`);
    }

    current = current[segment];
  }

  // TypeScript cannot guarentee T is returned
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return current as T;
};
