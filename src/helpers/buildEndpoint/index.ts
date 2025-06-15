import { omitBy } from 'lodash-es';
import queryString from 'query-string';
import { type PlainObject } from '#types.ts';
import { type BuildEndpointOptions } from './types.ts';

export const buildEndpoint = (
  basePath: string,
  path: string,
  {
    optionalPathTemplateRegExp,
    pathTemplateCallback,
    pathTemplateData,
    pathTemplateRegExp,
    queryParams = {},
  }: BuildEndpointOptions,
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

  const sanitisedSearchParams = omitBy<PlainObject>(queryParams, entry => entry !== undefined);

  if (Object.keys(sanitisedSearchParams).length > 0) {
    const queryJoin = queryString.extract(endpoint) ? '&' : '?';
    endpoint = `${endpoint}${queryJoin}${queryString.stringify(sanitisedSearchParams)}`;
  }

  return endpoint;
};
