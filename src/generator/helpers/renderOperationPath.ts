import { type RenderPathParametersResult } from '#generator/helpers/renderPathParameters.ts';

export type RenderOperationPathResult = {
  declarations: string;
  expression: string;
};

export const renderOperationPath = (
  path: string,
  renderedPathParameters: RenderPathParametersResult,
): RenderOperationPathResult => {
  const hasPathParameters = renderedPathParameters.declarations.length > 0;

  if (!hasPathParameters) {
    return {
      declarations: '',
      expression: JSON.stringify(path),
    };
  }

  const entries = [...renderedPathParameters.parameterNames].map(
    ([pathName, argumentName]) => `[${JSON.stringify(pathName)}]: ${argumentName}`,
  );

  const expression = String.raw`${JSON.stringify(path)}.replace(
    /\{([^}]+)\}/gu,
    (_match, name: string) => {
      const value = pathParameters[name as keyof typeof pathParameters];

      if (value === undefined || value === null) {
        throw new Error('Missing path parameter: ' + name);
      }

      return encodeURIComponent(String(value));
    },
  )`;

  return {
    declarations: `const pathParameters = { ${entries.join(', ')} };`,
    expression,
  };
};
