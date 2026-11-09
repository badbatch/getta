import { type GetRequestBodyContentTypeResult } from '#generator/helpers/createGetRequestBodyContentType.ts';

export type RenderOperationOptionsResult = {
  declarations: string;
  isRequired: boolean;
};

export const renderOperationOptions = (
  operationType: string,
  hasQueryParameters: boolean,
  requestBodyContentType: GetRequestBodyContentTypeResult | undefined,
): RenderOperationOptionsResult => {
  const members = [
    hasQueryParameters ? `  query?: __QueryParameters<${operationType}>;` : '',
    `  headers?: ( [__HeaderParameters<${operationType}>] extends [never] ? {} : __HeaderParameters<${operationType}> ) & Record<string, string | number | boolean>;`,
    requestBodyContentType
      ? `  body${requestBodyContentType.required ? '' : '?'}: __RequestBody<${operationType}>;`
      : '',
  ].filter(Boolean);

  const isRequired = requestBodyContentType?.required === true;

  return {
    declarations: `options${isRequired ? '' : '?'}: RequestInit${members.length > 0 ? ` & {\n${members.join('\n')}\n}` : ''}`,
    isRequired,
  };
};
