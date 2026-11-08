import { isFunction, omitBy } from 'remeda';
import { type SearchParams } from '#types.js';
import { type BuildEndpointOptions } from './types.ts';

export const buildEndpoint = (
  basePath: string,
  path: string,
  { optionalPathTemplateRegExp, pathTemplateCallback, pathTemplateData, pathTemplateRegExp }: BuildEndpointOptions,
): string => {
  const pathJoiner = basePath.endsWith('/') || path.startsWith('/') ? '' : '/';
  let endpoint = `${basePath}${pathJoiner}${path}`;

  if (pathTemplateData) {
    endpoint = pathTemplateCallback(endpoint, pathTemplateData, pathTemplateRegExp);
  }

  endpoint = endpoint.replace(optionalPathTemplateRegExp, '');

  if (endpoint.endsWith('/')) {
    endpoint = endpoint.slice(0, Math.max(0, endpoint.length - 1));
  }

  return endpoint;
};

export const appendSearchParams = (
  endpoint: string,
  searchParams: SearchParams,
  extraSearchParam: Record<string, string | string[]> = {},
): string => {
  const mergedSearchParams = {
    ...(isFunction(searchParams) ? searchParams(endpoint, extraSearchParam) : searchParams),
    ...extraSearchParam,
  };

  const sanitisedSearchParams = omitBy<Record<string, string | string[]>>(
    mergedSearchParams,
    // We have seen instances where value can be undefined
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    entry => entry === undefined,
  );

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(sanitisedSearchParams)) {
    const entries = Array.isArray(value) ? value : [value];

    for (const entry of entries) {
      params.append(key, entry);
    }
  }

  const query = params.toString();

  if (query) {
    const separator = endpoint.includes('?') ? (endpoint.endsWith('?') || endpoint.endsWith('&') ? '' : '&') : '?';
    endpoint += `${separator}${query}`;
  }

  return endpoint;
};
