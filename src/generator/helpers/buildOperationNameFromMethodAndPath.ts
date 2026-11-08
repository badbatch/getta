import { capitalize } from 'remeda';
import { type HttpMethod } from '#types.ts';

const stripApiAndVersionPrefix = (path: string): string =>
  path.replace(/^\/api(?:\/v(?:\d+(?:\.\d+)*|\{version(?::[^}]+)?\}))?(?=\/|$)/iu, '');

export const buildOperationNameFromMethodAndPath = (method: HttpMethod, path: string): string => {
  const segments = stripApiAndVersionPrefix(path).match(/[a-zA-Z0-9]+/gu) ?? [];
  return [method, ...segments].map((word, index) => (index === 0 ? word.toLowerCase() : capitalize(word))).join('');
};
