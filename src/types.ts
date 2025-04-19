import { type Core } from '@cachemap/core';
import { type SetRequired } from 'type-fest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PlainObject = Record<string, any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Func = (...args: any[]) => any;

export type FetchMethod = 'get' | 'post' | 'put' | 'delete';

export type StreamReader = 'arrayBuffer' | 'blob' | 'formData' | 'json' | 'text';

export type ShortcutProperties<T extends string | number> = Record<
  T,
  // Want to keep this as generic as possible.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <Resource = PlainObject>(...args: any[]) => Promise<FetchResponse<Resource>>
>;

export interface ConstructorOptions {
  /**
   * The base path of the url for all requests made from
   * an instance of the rest client, i.e. https://www.example.com/api.
   */
  basePath: string;
  /**
   * An optional callback to pass each response body through after
   * it has been parsed by the stream reader.
   */
  bodyParser?: Func;
  /**
   * An instance of the @cachemap/core cache for caching responses
   * against the request. Caching is only enabled on GET requests.
   * For more info on @cachemap/core see https://github.com/badbatch/cachemap.
   */
  cache?: Core;
  /**
   * Enables conditional requests with If-None-Match header.
   * Default is true
   */
  enableConditionalRequests?: boolean;
  /**
   * How long to wait for a request to respond before timing out
   * and returning an error.
   * Default is 5000
   */
  fetchTimeout?: number;
  /**
   * Any headers to attach to every request.
   */
  headers?: Record<string, string>;
  /**
   * Log function to pass rest client logs to a logger.
   */
  log?: Log;
  /**
   * The maximum number of times a request can redirect before
   * the rest client returns an error.
   * Default is 5
   */
  maxRedirects?: number;
  /**
   * The maximum number of times a request can retry before
   * the rest client returns an error.
   * Default is 3
   */
  maxRetries?: number;
  /**
   * An optional path template regex that can be used to clean up
   * the template url.
   * Default is /({\w+\?})/g
   */
  optionalPathTemplateRegExp?: RegExp;
  /**
   * A callback that takes the path template, the data to be injected into
   * the template, and the path template regex, and returns the templated url.
   * There is a default template callback that will cater to most needs.
   */
  pathTemplateCallback?: PathTemplateCallback;
  /**
   * A regex to tell the rest client where to inject data into the
   * template. There is a default one that will cater to most needs.
   */
  pathTemplateRegExp?: RegExp;
  /**
   * The performance module to use for recording request
   * durations.
   */
  performance: Performance;
  /**
   * Any query params to attach to every request.
   */
  queryParams?: PlainObject;
  /**
   * Whether to enable the rate limit feature.
   */
  rateLimit?: boolean;
  /**
   * How many requests per second to throttle the rest client.
   * Default is 50
   */
  rateLimitPerSecond?: number;
  /**
   * How many milliseconds to wait before retrying a request.
   * Default is 100
   */
  requestRetryWait?: number;
  /**
   * The stream reader to use when parsing the response body.
   * Default is 'json'
   */
  streamReader?: StreamReader;
}

export interface FetchOptions {
  body?: BodyInit;
  headers: Record<string, string>;
  method: FetchMethod;
  redirects?: number;
  retries?: number;
}

export interface FetchResponse<Resource = PlainObject> extends ResponseDataWithErrors<Resource>, Response {}

export interface FetchRedirectHandlerOptions extends FetchOptions {
  status: number;
}

export type Log = (message: string, data: PlainObject) => void;

export interface Performance {
  now(): number;
}

export interface RequestOptions {
  /**
   * For POST and PUT methods, the body to send with the request.
   */
  body?: BodyInit;
  /**
   * Any headers to attach to the request.
   */
  headers?: Record<string, string>;
  /**
   * The fetch method.
   */
  method?: FetchMethod;
  /**
   * Data to be injected into the path template.
   */
  pathTemplateData?: Record<string, string>;
  /**
   * Any query params to attach to the request.
   */
  queryParams?: PlainObject;
}

export type RequestQueue = [(value: FetchResponse) => void, string, FetchOptions, PlainObject][];

export interface ResponseDataWithErrors<Resource = PlainObject> {
  data?: Resource;
  errors?: Error[];
}

export type PathTemplateCallback = (path: string, data: Record<string, string>, pathTemplateRegExp: RegExp) => string;

export type PendingRequestResolver = (value: FetchResponse) => void;

export interface PendingRequestResolvers {
  resolve: PendingRequestResolver;
}

export interface RequestTracker {
  active: string[];
  pending: Map<string, PendingRequestResolvers[]>;
}

export type Shortcuts = Record<string, [string, SetRequired<RequestOptions, 'method'>]>;

export type Context = {
  startTime?: number;
};
