import queryString from "query-string";
import { BuildEndpointOptions } from "./types";

export default function buildEndpoint(
  basePath: string,
  path: string,
  {
    optionalPathTemplateRegExp,
    pathTemplateCallback,
    pathTemplateData,
    pathTemplateRegExp,
    queryParams,
  }: BuildEndpointOptions,
) {
  const pathJoiner = basePath.endsWith("/") || path.startsWith("/") ? "" : "/";
  let endpoint = `${basePath}${pathJoiner}${path}`;

  if (pathTemplateData) {
    endpoint = pathTemplateCallback(endpoint, pathTemplateData, pathTemplateRegExp);
  }

  endpoint = endpoint.replace(optionalPathTemplateRegExp, "");

  if (endpoint.endsWith("/")) {
    endpoint = endpoint.substring(0, endpoint.length - 1);
  }

  if (queryParams && Object.keys(queryParams).length) {
    const queryJoin = queryString.extract(endpoint) ? "&" : "?";
    endpoint = `${endpoint}${queryJoin}${queryString.stringify(queryParams)}`;
  }

  return endpoint;
}
