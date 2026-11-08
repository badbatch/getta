export type RenderOperationOptions = {
  operationName: string;
  operationType: string;
  parameters: string[];
  pathDeclarations: string;
  pathExpression: string;
  requestDeclarations: string;
  requestExpression: string;
};

export const renderOperation = ({
  operationName,
  operationType,
  parameters,
  pathDeclarations,
  pathExpression,
  requestDeclarations,
  requestExpression,
}: RenderOperationOptions): string => {
  const functionParameters = parameters.filter(Boolean).join(', ');

  const body = [
    pathDeclarations,
    `const path = ${pathExpression};`,
    requestDeclarations,
    `${requestExpression} as Promise<FetchResponse<__Response<${operationType}>>>;`,
  ]
    .filter(Boolean)
    .map(line => `    ${line}`)
    .join('\n');

  return `  ${operationName}: (${functionParameters}) => {\n${body}\n  },`;
};
