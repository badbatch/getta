# Getta

An isomorphic rest client based on the Fetch API.

[![build-and-deploy](https://github.com/badbatch/getta/actions/workflows/build-and-deploy.yml/badge.svg)](https://github.com/badbatch/getta/actions/workflows/build-and-deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![npm version](https://badge.fury.io/js/getta.svg)](https://badge.fury.io/js/getta)

## Installation

```bash
npm add getta @cachemap/core
```

`@cachemap/core` must be installed separately to use the cache option shown in the example; `getta` does not install it as a runtime dependency.

## Usage

You create an instance of the rest client with the `createRestClient` function. The function takes numerous options, including the base path of the url for all requests, a cache for caching responses against the request, and a performance module to use for recording request durations. The full list of the options are detailed below.

```typescript
import { Core } from '@cachemap/core';
import { createRestClient } from 'getta';
import { performance } from 'node:perf_hooks';

const restClient = createRestClient({
  basePath: 'https://www.example.com',
  cache: new Core({
    name: 'restClient',
    type: 'example',
  }),
  performance,
});
```

### Rest client options

**basePath: `string`**

The base path of the url for all requests made from an instance of the rest client, i.e. `'https://www.example.com/api'`.

**bodyParser?: `(...args: unknown[]) => unknown`**

An optional callback that receives each response body after it has been parsed by the stream reader, and returns the value exposed as `data`.

**cache?: `Core`**

An instance of the @cachemap/core cache for caching responses against requests. Caching is only enabled on `GET` requests and uses response cache headers and ETags when available. For more info on @cachemap/core see <https://github.com/badbatch/cachemap>.

**enableConditionalRequests?: `boolean`**

Enables conditional requests with If-None-Match header. Default is `true`.

**fetchTimeout?: `number`**

How long to wait for a request to respond before timing out and returning an error. Default is `5000`.

**headers?: `Record<string, string>`**

Any headers to attach to every request.

**log?: `(message: string, data: LogData) => void`**

Log function to pass rest client logs to a logger. `data` includes request context and may include response data, an error, or timing stats. `LogData` is exported from `getta`.

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

**queryParams?: `Record<string, string> | ((endpoint: string, extraSearchParams?: Record<string, string>) => Record<string, string>)`**

Query params to attach to every request. You can also provide a function to generate them from the endpoint and request-level query params.

**rateLimit?: `boolean`**

Whether to enable the rate limit feature.

**rateLimitPerSecond?: `number`**

How many requests per second to throttle the rest client. Default is `50`.

**requestRetryWait?: `number`**

How many milliseconds to wait before retrying a request. Default is `100`.

**streamReader?: `'arrayBuffer' | 'blob' | 'formData' | 'json' | 'text'`**

The stream reader to use when parsing the response body. Default is `'json'`.

### Making requests

The rest client supports `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD` and `OPTIONS` methods. It has convenience functions for `GET`, `POST`, `PUT` and `DELETE`, and a `request` function for all supported methods. The first argument is the path to make the request to. This can also be a path template with variable placeholders that will be replaced with data passed in on the `pathTemplateData` request option.

```typescript
// GET
const getResponse = await restClient.get('/path/to/resource');

// POST
const postResponse = await restClient.post('/graphql/api', {
  body: JSON.stringify({/* payload */}),
});

// PUT
const putResponse = await restClient.put('/path/to/resource', {
  body: JSON.stringify({/* payload */}),
});

// DELETE
const deleteResponse = await restClient.delete('/path/to/resource');

// PATCH
const patchResponse = await restClient.request('/path/to/resource', {
  body: JSON.stringify({/* payload */}),
  method: 'patch',
});
```

### Request options

**body?: `ReadableStream | Blob | BufferSource | FormData | URLSearchParams | string`**

For `POST` and `PUT` methods, the body to send with the request.

**headers?: `Record<string, string>`**

Any headers to attach to the request.

**method?: `'get' | 'post' | 'put' | 'delete' | 'patch' | 'head' | 'options'`**

The fetch method.

**pathTemplateData?: `Record<string, string>`**

Data to be injected into the path template.

**queryParams?: `Record<string, string>`**

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
      '/direct/rest/content/catalog/{type}/{id,+}?format={brief|standard}',
      {
        method: 'get',
        pathTemplateData: { 'brief|standard': 'standard', type: 'product' },
      },
    ],
  },
);

const getResponse = await restClient.getProduct({ pathTemplateData: { 'id,+': '136-7317' } });
```

### Generate an API client

The `getta` command generates a TypeScript client from an OpenAPI 3.x JSON or YAML document. Install Getta in your project, then run the command with the spec path and an optional output path. The default output is `api.generated.ts`.

```shell
pnpm exec getta generate-openapi ./openapi.json ./src/api.generated.ts
```

The command accepts a `--name` option to change the exported client factory name. YAML specs should use a `.yaml` or `.yml` file extension.

The generated module exports `createApiClient`. Pass it a configured Getta instance to create methods for the operations in the spec. Path parameters are positional arguments, in the order they appear in the operation. Query parameters, headers, and JSON request bodies go in an optional second argument:

```typescript
import { createRestClient } from 'getta';
import { performance } from 'node:perf_hooks';
import { createApiClient } from './api.generated';

const restClient = createRestClient({ basePath: 'https://www.example.com', performance });
const apiClient = createApiClient(restClient);

const response = await apiClient.getProduct('123', {
  query: { includeDetails: true },
});

const product = response.data;
```

#### Using the client with React context

Use the generated factory's return type for the context value. This keeps the context methods and parameters in sync when you regenerate the client:

```tsx
import { createContext, useContext, type ReactNode } from 'react';
import { createApiClient } from './api.generated';

type ApiClient = ReturnType<typeof createApiClient>;

const ApiContext = createContext<ApiClient | null>(null);

export const ApiProvider = ({ client, children }: { client: ApiClient; children: ReactNode }) => (
  <ApiContext.Provider value={client}>{children}</ApiContext.Provider>
);

export const useApi = (): ApiClient => {
  const client = useContext(ApiContext);

  if (!client) {
    throw new Error('useApi must be used within an ApiProvider.');
  }

  return client;
};

export const ProductButton = () => {
  const getta = useApi();

  return <button onClick={() => void getta.getProduct('123')}>Load product</button>;
};
```

Create the generated client once and pass it to the provider as its `client` prop. Components using `useApi()` can call typed methods such as `getProduct('123')`.

For an operation with a JSON request body, pass the body in the `body` property:

```typescript
await apiClient.createProduct({ body: { name: 'Desk lamp' } });
```

Operation names come from `operationId`; when it is missing, the command derives a name from the HTTP method and path. The generated module also exports types for schemas in `components.schemas`, and each operation's response is typed as `FetchResponse<T>` with the response body available as `data`. Configure Getta's `basePath` separately from the OpenAPI `servers` value.

The generator supports local component schema references, path/query/header parameters, JSON request bodies, and JSON success responses. It uses basic parameter serialization and does not generate cookie parameters, external references, callbacks, security configuration, non-JSON request bodies, or custom array/object parameter styles.

### Responses and errors

Each request resolves to the Fetch API `Response` with a parsed `data` property added. The body parser receives the value produced by the configured stream reader. Requests reject with an error on network failures, timeouts, GET 404 responses, or when the redirect or retry limit is reached. Other HTTP status codes, including non-404 client errors, are returned in the response. Server errors are retried and reject when the retry limit is reached.

## Changelog

Check out the [features, fixes and more](CHANGELOG.md) that go into each major, minor and patch version.

## License

Getta is [MIT Licensed](LICENSE).
