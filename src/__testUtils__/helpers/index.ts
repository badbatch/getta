import { Core } from '@cachemap/core';
import { init as map } from '@cachemap/map';
import { DEFAULT_PATH_TEMPLATE_REGEX } from '../../constants.ts';
import { buildEndpoint } from '../../helpers/buildEndpoint/index.ts';
import { defaultPathTemplateCallback } from '../../helpers/defaultPathTemplateCallback/index.ts';
import { OPTIONAL_PATH_TEMPLATE_REGEX } from '../../index.ts';
import { type RequestOptions } from '../../types.ts';

export const basePath = 'https://example.com';

export const defaultPath = '/direct/rest/content/catalog/{type}/{id,+}?format={brief|standard}';

export const graphqlPath = '/graphql/api';

export const defaultPathTemplateData = { 'brief|standard': 'standard', 'id,+': '136-7317', type: 'product' };

export const defaultPayload = { payload: true };

export const idPathTemplateData = { 'id,+': '136-7317' };

export const pathTemplateDataWithoutID = { 'brief|standard': 'standard', type: 'product' };

export const defaultEtag = '33a64df551425fcc55e4d42a148795d9f25f89d4';

export const defaultHeaders = {
  'cache-control': 'public, max-age=6000',
  'content-type': 'application/json',
  etag: defaultEtag,
};

export const getCache = () => {
  return new Core({
    name: 'cachemap',
    store: map(),
    type: 'test',
  });
};

export const buildTestEndpoint = (
  path: string,
  { pathTemplateData = defaultPathTemplateData, queryParams }: RequestOptions = {}
) =>
  buildEndpoint(basePath, path, {
    optionalPathTemplateRegExp: OPTIONAL_PATH_TEMPLATE_REGEX,
    pathTemplateCallback: defaultPathTemplateCallback,
    pathTemplateData,
    pathTemplateRegExp: DEFAULT_PATH_TEMPLATE_REGEX,
    queryParams,
  });
