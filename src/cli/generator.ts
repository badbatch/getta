type RecordValue = Record<string, unknown>;

type OpenApiDocument = RecordValue & { openapi: string; paths: Record<string, RecordValue> };

type OpenApiParameter = RecordValue & { in: string; name: string };

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'] as const;

const isRecord = (value: unknown): value is RecordValue =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const isUnknownArray = (value: unknown): value is unknown[] => Array.isArray(value);

const isParameter = (value: unknown): value is OpenApiParameter =>
  isRecord(value) && typeof value.name === 'string' && typeof value.in === 'string';

const getRecord = (value: unknown): RecordValue | undefined => (isRecord(value) ? value : undefined);
const getSchema = (value: unknown): RecordValue | undefined => getRecord(value);

const identifier = (value: string, fallback: string): string => {
  const normalized = value.replaceAll(/[^\w$]/gu, '_');
  const safe = /^[A-Za-z_$]/u.test(normalized) ? normalized : `_${normalized}`;

  return safe || fallback;
};

const schemaType = (schema: RecordValue | undefined, depth = 0): string => {
  if (!schema || depth > 12) return 'unknown';

  if (typeof schema.$ref === 'string') {
    const name = schema.$ref.split('/').at(-1);
    return name ? identifier(name, 'Unknown') : 'unknown';
  }

  if (isUnknownArray(schema.enum)) return schema.enum.map(value => JSON.stringify(value)).join(' | ') || 'never';

  const compositions: [string, string][] = [
    ['oneOf', ' | '],
    ['anyOf', ' | '],
    ['allOf', ' & '],
  ];

  for (const [key, separator] of compositions) {
    const members = schema[key];

    if (isUnknownArray(members)) {
      return members.map(member => schemaType(getSchema(member), depth + 1)).join(separator);
    }
  }

  let result: string;

  switch (schema.type) {
    case 'string': {
      result = 'string';
      break;
    }

    case 'integer': {
      result = 'number';
      break;
    }

    case 'number': {
      result = 'number';
      break;
    }

    case 'boolean': {
      result = 'boolean';
      break;
    }

    case 'array': {
      result = `Array<${schemaType(getSchema(schema.items), depth + 1)}>`;
      break;
    }

    default: {
      const properties = getRecord(schema.properties);
      if (properties || schema.type === 'object') {
        const required = new Set(
          isUnknownArray(schema.required)
            ? schema.required.filter((item): item is string => typeof item === 'string')
            : [],
        );

        const members = Object.entries(properties ?? {}).map(
          ([name, property]) =>
            `  ${JSON.stringify(name)}${required.has(name) ? '' : '?'}: ${schemaType(getSchema(property), depth + 1)};`,
        );

        const additionalProperties = getSchema(schema.additionalProperties);

        if (additionalProperties) {
          members.push(`[key: string]: ${schemaType(additionalProperties, depth + 1)};`);
        }

        result = members.length > 0 ? `{\n${members.join('\n')}\n}` : 'Record<string, unknown>';
      } else result = 'unknown';
    }
  }

  return schema.nullable === true ? `${result} | null` : result;
};

const getRequestBody = (operation: RecordValue): { required: boolean; type: string } | undefined => {
  const requestBody = getRecord(operation.requestBody);
  const content = getRecord(requestBody?.content);
  const mediaType = Object.keys(content ?? {}).find(type => type === 'application/json' || type.endsWith('+json'));
  const media = mediaType ? getRecord(content?.[mediaType]) : undefined;

  if (!media) {
    if (content && Object.keys(content).length > 0) {
      throw new Error('Only JSON request body content types are supported.');
    }

    return undefined;
  }

  return { required: requestBody?.required === true, type: schemaType(getSchema(media.schema)) };
};

const getResponseType = (operation: RecordValue): string => {
  const responses = getRecord(operation.responses);
  const success = Object.entries(responses ?? {}).find(([status]) => /^2\d\d$/u.test(status))?.[1];
  const content = getRecord(getRecord(success)?.content);
  const mediaType = Object.keys(content ?? {}).find(type => type === 'application/json' || type.endsWith('+json'));
  const media = mediaType ? getRecord(content?.[mediaType]) : undefined;

  return schemaType(getSchema(media?.schema));
};

const operationParameters = (pathItem: RecordValue, operation: RecordValue): OpenApiParameter[] => {
  const inherited = isUnknownArray(pathItem.parameters)
    ? pathItem.parameters.filter(parameter => isParameter(parameter))
    : [];

  const local = isUnknownArray(operation.parameters)
    ? operation.parameters.filter(parameter => isParameter(parameter))
    : [];

  const parameters = new Map<string, OpenApiParameter>();

  for (const parameter of [...inherited, ...local]) {
    parameters.set(`${parameter.in}:${parameter.name}`, parameter);
  }

  return parameters.values().toArray();
};

const renderParameterGroup = (parameters: OpenApiParameter[], location: string): string[] =>
  parameters
    .filter(parameter => parameter.in === location)
    .map(parameter => {
      const name = JSON.stringify(parameter.name);
      const isRequired = parameter.required === true;
      const type = schemaType(getSchema(parameter.schema));
      return `    ${name}${isRequired ? '' : '?'}: ${type};`;
    });

const renderPositionalParameters = (
  parameters: OpenApiParameter[],
): { declarations: string[]; names: Map<string, string> } => {
  const names = new Map<string, string>();
  const usedNames = new Set<string>();

  const declarations = parameters.map((parameter, index) => {
    const baseName = identifier(parameter.name, `pathParameter${String(index + 1)}`);
    let name = baseName;
    let suffix = 2;

    while (usedNames.has(name)) name = `${baseName}_${String(suffix++)}`;
    usedNames.add(name);
    names.set(parameter.name, name);
    return `${name}: ${schemaType(getSchema(parameter.schema))}`;
  });

  return { declarations, names };
};

const generateOperation = (
  path: string,
  method: string,
  pathItem: RecordValue,
  operation: RecordValue,
  usedNames: Set<string>,
): string => {
  const rawName = typeof operation.operationId === 'string' ? operation.operationId : `${method}_${path}`;
  const baseName = identifier(rawName, 'operation');
  let name = baseName;
  let suffix = 2;

  while (usedNames.has(name)) name = `${baseName}_${(suffix++).toString()}`;
  usedNames.add(name);

  const parameters = operationParameters(pathItem, operation);
  const pathParameters = parameters.filter(parameter => parameter.in === 'path');
  const positionalParameters = renderPositionalParameters(pathParameters);
  const queryParameters = renderParameterGroup(parameters, 'query');
  const headerParameters = renderParameterGroup(parameters, 'header');
  const body = getRequestBody(operation);

  const inputMembers = [
    queryParameters.length > 0 ? `  query?: {\n${queryParameters.join('\n')}\n  };` : '',
    headerParameters.length > 0 ? `  headers?: {\n${headerParameters.join('\n')}\n  };` : '',
    body ? `  body${body.required ? '' : '?'}: ${body.type};` : '',
  ].filter(Boolean);

  const isInputRequired = body?.required === true;

  const argument =
    inputMembers.length > 0 ? `options${isInputRequired ? '' : '?'}: {\n${inputMembers.join('\n')}\n}` : '';

  const functionParameters = [...positionalParameters.declarations, argument].filter(Boolean).join(', ');

  const pathParameterValues =
    pathParameters.length > 0
      ? `    const pathParameters = { ${[...positionalParameters.names]
          .map(([pathName, argumentName]) => `${JSON.stringify(pathName)}: ${argumentName}`)
          .join(', ')} };\n`
      : '';

  const requestPath =
    pathParameters.length > 0
      ? String.raw`${JSON.stringify(path)}.replace(/\{([^}]+)\}/gu, (_match, name: string) => encodeURIComponent(String(pathParameters[name as keyof typeof pathParameters])))`
      : JSON.stringify(path);

  const queryValues =
    queryParameters.length > 0
      ? "Object.fromEntries(Object.entries(options?.query ?? {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : String(value)]))"
      : '{}';

  const headers =
    headerParameters.length > 0
      ? 'Object.fromEntries(Object.entries(options?.headers ?? {}).map(([key, value]) => [key, String(value)]))'
      : '{}';

  const bodyValue = body ? 'body: options?.body === undefined ? undefined : JSON.stringify(options.body),' : '';
  const clientMethod = method === 'get' || method === 'delete' ? `client.${method}` : 'client.request';
  const methodValue = method === 'get' || method === 'delete' ? '' : `method: ${JSON.stringify(method)},`;

  return `  ${name}: (${functionParameters}) => {\n${pathParameterValues}    const path = ${requestPath};\n    return ${clientMethod}(path, {\n      ${methodValue}\n      queryParams: ${queryValues},\n      headers: ${headers},\n      ${bodyValue}\n    }) as Promise<FetchResponse<${getResponseType(operation)}>>;\n  },`;
};

const isOpenApiDocument = (value: unknown): value is OpenApiDocument =>
  isRecord(value) && typeof value.openapi === 'string' && isRecord(value.paths);

export const generateOpenApiClient = (input: unknown, clientName = 'createApiClient'): string => {
  if (!isOpenApiDocument(input) || !input.openapi.startsWith('3.')) {
    throw new Error('Expected an OpenAPI 3.x document.');
  }

  const schemas = Object.entries(getRecord(getRecord(input.components)?.schemas) ?? {})
    .filter((entry): entry is [string, RecordValue] => isRecord(entry[1]))
    .map(([name, schema]) => `export type ${identifier(name, 'Schema')} = ${schemaType(schema)};`);

  const usedNames = new Set<string>();

  const operations = Object.entries(input.paths).flatMap(([path, pathItem]) =>
    HTTP_METHODS.flatMap(method => {
      const operation = pathItem[method];
      return isRecord(operation) ? [generateOperation(path, method, pathItem, operation, usedNames)] : [];
    }),
  );

  return [
    "import { type Getta } from 'getta';",
    "import { type FetchResponse } from 'getta';",
    '',
    ...schemas,
    ...(schemas.length > 0 ? [''] : []),
    `export const ${identifier(clientName, 'createApiClient')} = (client: Getta) => ({`,
    ...operations,
    '});',
    '',
  ].join('\n');
};
