import { isFunction, omitBy } from 'lodash-es';
import queryString from 'query-string';
import { type SearchParams } from '#types.js';
import { type BuildEndpointOptions } from './types.ts';

export const buildEndpoint = (
  basePath: string,
  path: string,
  { optionalPathTemplateRegExp, pathTemplateCallback, pathTemplateData, pathTemplateRegExp }: BuildEndpointOptions,
) => {
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
  extraSearchParam: Record<string, string> = {},
) => {
  const mergedSearchParams = {
    ...(isFunction(searchParams) ? searchParams(endpoint, extraSearchParam) : searchParams),
    ...extraSearchParam,
  };

  // We have seen instances where value can be undefined
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const sanitisedSearchParams = omitBy<Record<string, string>>(mergedSearchParams, entry => entry === undefined);

  if (Object.keys(sanitisedSearchParams).length > 0) {
    const queryJoin = queryString.extract(endpoint) ? '&' : '?';
    endpoint = `${endpoint}${queryJoin}${queryString.stringify(sanitisedSearchParams)}`;
  }

  return endpoint;
};
