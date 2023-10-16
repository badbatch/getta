# Getta

An isomorphic rest client based on the Fetch API.

[![build-and-deploy](https://github.com/badbatch/getta/actions/workflows/build-and-deploy.yml/badge.svg)](https://github.com/badbatch/getta/actions/workflows/build-and-deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![npm version](https://badge.fury.io/js/getta.svg)](https://badge.fury.io/js/getta)

## Installation

```bash
npm add getta
```

## Usage

You create an instance of the rest client with the `createRestClient` function. The function takes numerous options, including the base path of the url for all requests, a cache for caching responses against the request, and a performance module to use for recording request durations. The full list of the options are detailed below.

```typescript
import { Core } from '@cachemap/core';
import { init as map } from '@cachemap/map';
import { createRestClient } from 'getta';
import { performance } from 'node:perf_hooks';

const restClient = createRestClient({
  basePath: 'https://www.example.com',
  cache: new Core({
    name: 'restClient',
    store: map(),
    type: 'example',
  }),
  performance
});
```

### Rest client options

**basePath: `string`**

The base path of the url for all requests made from an instance of the rest client, i.e. `'https://www.example.com/api'`.

**bodyParser?: `(...args: any[]) => any`**

An optional callback to pass each response body through after it has been parsed by the stream reader.

**cache?: `Core`**

An instance of the @cachemap/core cache for caching responses against requests. Caching is only enabled on `GET` requests. For more info on @cachemap/core see <https://github.com/badbatch/cachemap>.

**enableConditionalRequests?: `boolean`**

Enables conditional requests with If-None-Match header. Default is `true`.

**fetchTimeout?: `number`**

How long to wait for a request to respond before timing out and returning an error. Default is `5000`.

**headers?: `Record<string, string>`**

Any headers to attach to every request.

**log?: `(message: string, data: PlainObject, logLevel?: LogLevel) => void`**

Log function to pass rest client logs to a logger.

**maxRedirects?: `number`**

The maximum number of times a request can redirect before the rest client returns an error. Default is `5`.

**maxRetries?: `number`**

The maximum number of times a request can retry before the rest client returns an error. Default is `3`.

**optionalPathTemplateRegExp?: `RegExp`**

An optional path template regex that can be used to clean up the template url. Default is `/({\w+\?})/g`.

**pathTemplateCallback?: `(pathTemplate: string, data: Record<string, string>, pathTemplateRegExp: RegExp) => string`**

A callback that takes the path template, the data to be injected into the template, and the path template regex, and returns the templated url. There is a default template callback that will cater to most needs.

**pathTemplateRegExp?: `RegExp`**

A regex to tell the rest client where to inject data into the template. There is a default one that will cater to some needs. Default is `/({type})|({id})|({id,\+})|({brief\|standard})/g`.

**performance: `Performance`**

The performance module to use for recording request durations.

**queryParams?: `PlainObject`**

Any query params to attach to every request.

**rateLimit?: `boolean`**

Whether to enable the rate limit feature.

**rateLimitPerSecond?: `number`**

How many requests per second to throttle the rest client. Default is `50`.

**requestRetryWait?: `number`**

How many milliseconds to wait before retrying a request. Default is `100`.

**streamReader?: `'arrayBuffer' | 'blob' | 'formData' | 'json' | 'text'`**

The stream reader to use when parsing the response body. Default is `'json'`.

### Making reqeusts

The rest client supports `GET`, `POST`, `PUT` and `DELETE` methods and has functions for each method.

```typescript
const pathTemplate = '/direct/rest/content/catalog/{type}/{id,+}?format={brief|standard}';
const pathTemplateData = { 'brief|standard': 'standard', 'id,+': '136-7317', type: 'product' };

// GET
const getResponse = await restClient.get(pathTemplate, { pathTemplateData });

// POST
const postResponse = await restClient.post('/graphql/api', {
  body: JSON.stringify({ /* payload */ }),
});

// PUT
const putResponse = await restClient.put(pathTemplate, {
  body: JSON.stringify({ /* payload */  }),
  pathTemplateData,
});

// DELETE
const deleteResponse = await restClient.delete(pathTemplate, { pathTemplateData });
```

### Request options

**body?: `ReadableStream | Blob | BufferSource | FormData | URLSearchParams | string`**

For `POST` and `PUT` methods, the body to send with the request.

**headers?: `Record<string, string>`**

Any headers to attach to the request.

**method?: `'get' | 'post' | 'put' | 'delete'`**

The fetch method.

**pathTemplateData?: `Record<string, string>`**

Data to be injected into the path template.

**queryParams?: `PlainObject`**

Any query params to attach to the request.

### Shortcuts

It is possible to alias a request and bake things like the path template and request options into the alias, reducing the number of options that need to be passed into a request.

```typescript
import { createRestClient } from 'getta';
import { performance } from 'node:perf_hooks';

const restClient = createRestClient<'getProduct'>(
  { basePath: 'https://www.example.com', performance },
  {
    getProduct: [
      '/direct/rest/content/catalog/{type}/{id,+}?format={brief|standard}'
      {
        method: consts.GET_METHOD,
        pathTemplateData: { 'brief|standard': 'standard', type: 'product' },
      },
    ],
  }
);

const getResponse = await restClient.getProduct({ pathTemplateData: { 'id,+': '136-7317' } });
```

## Changelog

Check out the [features, fixes and more](CHANGELOG.md) that go into each major, minor and patch version.

## License

Getta is [MIT Licensed](LICENSE).
