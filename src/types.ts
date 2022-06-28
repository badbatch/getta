import Cachemap from "@cachemap/core";
import { Func, PlainObject, StringObject } from "@repodog/types";
import { Required } from "utility-types";

export type FetchMethod = "get" | "post" | "put" | "delete";

export type StreamReader = "arrayBuffer" | "blob" | "formData" | "json" | "text";

export type ShortcutProperties<T extends string | number> = {
  [K in T]: <Resource = PlainObject>(...args: any[]) => Promise<FetchResponse<Resource>>;
};

export interface ConstructorOptions {
  basePath: string;
  bodyParser?: Func;
  cache?: Cachemap;
  enableConditionalRequests?: boolean;
  fetchTimeout?: number;
  headers?: StringObject;
  maxRedirects?: number;
  maxRetries?: number;
  optionalPathTemplateRegExp?: RegExp;
  pathTemplateCallback?: PathTemplateCallback;
  pathTemplateRegExp?: RegExp;
  queryParams?: PlainObject;
  rateLimitPerSecond?: number;
  requestRetryWait?: number;
  streamReader?: StreamReader;
}

export interface FetchOptions {
  body?: BodyInit;
  headers: StringObject;
  method: FetchMethod;
  redirects?: number;
  retries?: number;
}

export interface FetchResponse<Resource = PlainObject> extends ResponseDataWithErrors<Resource>, Response {}

export interface FetchRedirectHandlerOptions extends FetchOptions {
  status: number;
}

export interface RequestOptions {
  body?: BodyInit;
  headers?: StringObject;
  method?: FetchMethod;
  pathTemplateData?: StringObject;
  queryParams?: PlainObject;
}

export type RequestQueue = [(value: FetchResponse) => void, string, FetchOptions][];

export interface ResponseDataWithErrors<Resource = PlainObject> {
  data?: Resource;
  errors?: Error[];
}

export type PathTemplateCallback = (path: string, data: StringObject, pathTemplateRegExp: RegExp) => string;

export type PendingRequestResolver = (value: FetchResponse<PlainObject>) => void;

export interface PendingRequestResolvers {
  resolve: PendingRequestResolver;
}

export interface RequestTracker {
  active: string[];
  pending: Map<string, PendingRequestResolvers[]>;
}

export interface Shortcuts {
  [key: string]: [string, Required<RequestOptions, "method">];
}
