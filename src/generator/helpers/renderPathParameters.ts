import { type ParameterObject } from 'openapi-typescript';
import { reservedTypeScriptKeywords } from '#generator/helpers/reservedTypeScriptKeywords.ts';

export type RenderPathParametersResult = {
  declarations: string[];
  parameterNames: Map<string, string>;
};

const buildName = (value: string, fallback: string): string => {
  const normalized = value.replaceAll(/[^\w$]/gu, '_');
  const safe = /^[A-Za-z_$]/u.test(normalized) ? normalized : `_${normalized}`;
  return !safe || reservedTypeScriptKeywords.has(safe) ? `_${fallback}` : safe;
};

export const renderPathParameters = (
  pathParameters: ParameterObject[],
  operationType: string,
): RenderPathParametersResult => {
  const parameterNames = new Map<string, string>();
  const usedNames = new Set<string>();

  const declarations = pathParameters.map((parameter, index) => {
    const parameterName = parameter.name;
    const baseName = buildName(parameterName, `pathParameter${String(index + 1)}`);
    let name = baseName;
    let suffix = 2;

    while (usedNames.has(name)) {
      name = `${baseName}_${String(suffix++)}`;
    }

    usedNames.add(name);
    parameterNames.set(parameterName, name);
    return `${name}: NonNullable<__PathParameters<${operationType}>[${JSON.stringify(parameterName)}]>`;
  });

  return { declarations, parameterNames };
};
