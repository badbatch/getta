import { capitalize, uncapitalize } from 'remeda';

const isCamelCase = (name: string): boolean => /^[a-z][a-z0-9]*(?:[A-Z][a-z0-9]*)*$/.test(name);

export const sanitiseOperationId = (name: string): string => {
  if (isCamelCase(name)) {
    return name;
  }

  const segments = name.match(/[a-zA-Z0-9]+/gu) ?? [];
  return segments.map((word, index) => (index === 0 ? uncapitalize(word) : capitalize(word))).join('');
};
