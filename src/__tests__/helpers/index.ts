import Cachemap from "@cachemap/core";
import map from "@cachemap/map";
import { PlainObject } from "@repodog/types";
import { DEFAULT_PATH_TEMPLATE_REGEX } from "../../constants";
import buildEndpoint from "../../helpers/build-endpoint";
import defaultPathTemplateCallback from "../../helpers/default-path-template-callback";
import { RequestOptions } from "../../types";
import { MockRequestCallbackParams, TearDownTestParams } from "../types";

export const basePath = "https://tesco.com";

export const defaultPath = "/direct/rest/content/catalog/{type}/{id,+}?format={brief|standard}";

export const defaultPathTemplateData = { "brief|standard": "standard", "id,+": "136-7317", type: "product" };

export const defaultPayload = "{ payload: true }";

export const idPathTemplateData = { "id,+": "136-7317" };

export const pathTemplateDataWithoutID = { "brief|standard": "standard", type: "product" };

export const defaultEtag = "33a64df551425fcc55e4d42a148795d9f25f89d4";

export const defaultHeaders = {
  "cache-control": "public, max-age=6000",
  "content-type": "application/json",
  etag: defaultEtag,
};

export function getCache() {
  return new Cachemap({
    name: "cachemap",
    store: map(),
  });
}

export function mockRequest(
  path: string,
  body: PlainObject,
  { headers = {}, pathTemplateData, queryParams }: RequestOptions = {},
  callback: (options: MockRequestCallbackParams) => void,
) {
  callback({
    body: JSON.stringify(body),
    endpoint: buildEndpoint(basePath, path, {
      pathTemplateCallback: defaultPathTemplateCallback,
      pathTemplateData,
      pathTemplateRegExp: DEFAULT_PATH_TEMPLATE_REGEX,
      queryParams,
    }),
    headers: { ...defaultHeaders, ...headers },
  });
}

export async function tearDownTest({ fetchMock, restClient }: TearDownTestParams) {
  fetchMock.restore();
  await restClient?.cache?.clear();
}
