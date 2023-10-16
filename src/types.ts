import { type Core } from '@cachemap/core';
import type { SetRequired } from 'type-fest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PlainObject = Record<string, any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Func = (...args: any[]) => any;

export type FetchMethod = 'get' | 'post' | 'put' | 'delete';

export type StreamReader = 'arrayBuffer' | 'blob' | 'formData' | 'json' | 'text';

export type ShortcutProperties<T extends string | number> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in T]: <Resource = PlainObject>(...args: any[]) => Promise<FetchResponse<Resource>>;
};

export interface ConstructorOptions {
  basePath: string;
  bodyParser?: Func;
  cache?: Core;
  enableConditionalRequests?: boolean;
  fetchTimeout?: number;
  headers?: Record<string, string>;
  log?: Log;
  maxRedirects?: number;
  maxRetries?: number;
  optionalPathTemplateRegExp?: RegExp;
  pathTemplateCallback?: PathTemplateCallback;
  pathTemplateRegExp?: RegExp;
  performance: Performance;
  queryParams?: PlainObject;
  rateLimit?: boolean;
  rateLimitPerSecond?: number;
  requestRetryWait?: number;
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

export type Log = (message: string, data: PlainObject, logLevel?: LogLevel) => void;

export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

export interface Performance {
  now(): number;
}

export interface RequestOptions {
  body?: BodyInit;
  headers?: Record<string, string>;
  method?: FetchMethod;
  pathTemplateData?: Record<string, string>;
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
