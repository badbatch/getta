import { type OperationHelper } from '#generator/helpers/createGenerateOperation.ts';

const identifier = (value: string): string => {
  const normalized = value.replaceAll(/[^\w$]/gu, '_');
  return /^[A-Za-z_$]/u.test(normalized) ? normalized : `_${normalized}`;
};

export const generateClientSource = (
  clientName: string,
  typesImportPath: string,
  operationTypes: string[],
  operations: string[],
  requiredHelpers: ReadonlySet<OperationHelper>,
): string => {
  const hasOperations = operations.length > 0;

  return [
    '/* eslint-disable */',
    hasOperations ? "import { type Getta, type FetchResponse } from 'getta';" : "import { type Getta } from 'getta';",
    ...(hasOperations ? [`import type { paths } from '${typesImportPath}';`] : []),
    '',
    ...(requiredHelpers.has('pathParameters')
      ? [
          'type __PathParameters<T> = T extends { parameters?: infer P }',
          '  ? P extends { path?: infer V } ? V : {}',
          '  : {};',
          '',
        ]
      : []),
    ...(requiredHelpers.has('queryParameters')
      ? [
          'type __QueryParameters<T> = T extends { parameters?: infer P }',
          '  ? P extends { query?: infer V } ? V : {}',
          '  : {};',
          '',
        ]
      : []),
    ...(hasOperations
      ? [
          'type __HeaderParameters<T> = T extends { parameters?: infer P }',
          '  ? P extends { header?: infer V } ? NonNullable<V> : {}',
          '  : {};',
          '',
        ]
      : []),
    ...(requiredHelpers.has('requestBody')
      ? [
          'type __RequestBody<T> = T extends { requestBody?: { content: infer C } }',
          "  ? C extends { 'application/json': infer J } ? J",
          "    : C extends { 'multipart/form-data': infer M } ? M",
          '    : C extends Record<string, infer V> ? V',
          '    : never',
          '  : never;',
          '',
        ]
      : []),
    ...(hasOperations
      ? [
          'type __IsSuccess<S> = S extends number',
          '  ? `${S}` extends `2${string}` ? true : false',
          '  : S extends `2${string}` ? true : false;',
          '',
          'type __ResponseContent<R> = R extends { content: infer C }',
          '  ? C extends Record<string, infer V> ? V : unknown',
          '  : unknown;',
          '',
          'type __Response<T> = T extends { responses: infer R }',
          '  ? { [S in keyof R]: __IsSuccess<S> extends true ? __ResponseContent<R[S]> : never }[keyof R]',
          '  : unknown;',
          '',
        ]
      : []),
    ...operationTypes,
    '',
    `export const ${identifier(clientName)} = (${hasOperations ? 'client' : '_client'}: Getta) => ({`,
    ...operations,
    '});',
    '',
  ].join('\n');
};
