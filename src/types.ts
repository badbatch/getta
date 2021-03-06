import Cachemap from "@cachemap/core";
import { Func, StringObject } from "@repodog/types";
import { JsonObject, JsonValue } from "type-fest";
import { Required } from "utility-types";

export type FetchMethod = "get" | "post" | "put" | "delete";

export type StreamReader = "arrayBuffer" | "blob" | "formData" | "json" | "text";

export type ShortcutProperties<T extends string | number> = {
  [K in T]: (...args: any[]) => Promise<ResponseDataWithErrors>;
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
  pathTemplateCallback?: PathTemplateCallback;
  pathTemplateRegExp?: RegExp;
  queryParams?: JsonObject;
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

export interface FetchResponse extends ResponseDataWithErrors, Response {}

export interface FetchRedirectHandlerOptions extends FetchOptions {
  status: number;
}

export interface RequestOptions {
  body?: BodyInit;
  headers?: StringObject;
  method?: FetchMethod;
  pathTemplateData?: StringObject;
  queryParams?: JsonObject;
}

export interface ResponseData {
  data?: JsonValue;
}

export interface ResponseDataWithErrors extends ResponseData {
  errors?: Error[];
}

export type PathTemplateCallback = (path: string, data: StringObject, pathTemplateRegExp: RegExp) => string;

export type PendingRequestResolver = (value: FetchResponse) => void;

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
