import { type GetRequestBodyContentTypeResult } from '#generator/helpers/createGetRequestBodyContentType.ts';
import { renderMultipartBody } from '#generator/helpers/renderMultipartBody.ts';
import { type HttpMethod } from '#types.ts';

export type RenderOperationRequestResult = {
  declarations: string;
  expression: string;
};

export const renderOperationRequest = (
  hasQueryParameters: boolean,
  method: HttpMethod,
  requestBodyContentType?: GetRequestBodyContentTypeResult,
): RenderOperationRequestResult => {
  const queryParameters = hasQueryParameters
    ? `Object.fromEntries(
      Object.entries(options?.query ?? {}).map(([key, value]) => [
        key,
        Array.isArray(value)
          ? value.map(item => String(item))
          : String(value),
      ]),
    )`
    : '{}';

  const headers = `Object.fromEntries(
        Object.entries(options?.headers ?? {})
          .filter(([_key]) => ${
            requestBodyContentType?.contentType === 'multipart' ? "_key.toLowerCase() !== 'content-type'" : 'true'
          })
          .map(([key, value]) => [key, String(value)]),
      )`;

  const multipartSetup = requestBodyContentType?.contentType === 'multipart' ? renderMultipartBody() : '';

  const body = requestBodyContentType
    ? requestBodyContentType.contentType === 'multipart'
      ? 'body: options?.body === undefined ? undefined : formData,'
      : 'body: options?.body === undefined ? undefined : JSON.stringify(options.body),'
    : '';

  const isDirectMethod = method === 'get' || method === 'delete';

  return {
    declarations: multipartSetup,
    expression: `return client.${isDirectMethod ? method : 'request'}(path, {
      ${isDirectMethod ? '' : `method: ${JSON.stringify(method)},`}
      queryParams: ${queryParameters},
      headers: ${headers},
      ${body}
    })`,
  };
};
