import Cachemap, { CacheHeaders } from "@cachemap/core";
import { Func, PlainObject, StringObject } from "@repodog/types";
import Cacheability from "cacheability";
import { merge } from "lodash";
import md5 from "md5";
import { Required } from "utility-types";
import {
  CACHE_CONTROL_HEADER,
  DEFAULT_BODY_PARSER,
  DEFAULT_FETCH_TIMEOUT,
  DEFAULT_HEADERS,
  DEFAULT_MAX_REDIRECTS,
  DEFAULT_MAX_RETRIES,
  DEFAULT_PATH_TEMPLATE_REGEX,
  DEFAULT_REQUEST_RETRY_WAIT,
  DELETE_METHOD,
  ETAG_HEADER,
  FETCH_METHODS,
  FETCH_TIMEOUT_ERROR,
  GET_METHOD,
  IF_NONE_MATCH_HEADER,
  INVALID_FETCH_METHOD_ERROR,
  JSON_FORMAT,
  LOCATION_HEADER,
  MAX_REDIRECTS_EXCEEDED_ERROR,
  MAX_RETRIES_EXCEEDED_ERROR,
  MISSING_BASE_PATH_ERROR,
  NOT_FOUND_STATUS_CODE,
  NOT_MODIFIED_STATUS_CODE,
  OPTIONAL_PATH_TEMPLATE_REGEX,
  POST_METHOD,
  PUT_METHOD,
  REDIRECTION_REPSONSE,
  RESOURCE_NOT_FOUND_ERROR,
  SERVER_ERROR_REPSONSE,
} from "./constants";
import buildEndpoint from "./helpers/build-endpoint";
import defaultPathTemplateCallback from "./helpers/default-path-template-callback";
import delay from "./helpers/delay";
import getResponseGroup from "./helpers/get-response-group";
import isCacheabilityValid from "./helpers/is-cacheability-valid";
import {
  ConstructorOptions,
  FetchOptions,
  FetchRedirectHandlerOptions,
  FetchResponse,
  PathTemplateCallback,
  PendingRequestResolver,
  PendingRequestResolvers,
  RequestOptions,
  RequestTracker,
  ShortcutProperties,
  Shortcuts,
  StreamReader,
} from "./types";

export class Getta {
  private _basePath: string;
  private _bodyParser: Func;
  private _cache?: Cachemap;
  private _conditionalRequestsEnabled: boolean;
  private _fetchTimeout: number;
  private _headers: StringObject;
  private _maxRedirects: number;
  private _maxRetries: number;
  private _optionalPathTemplateRegExp: RegExp;
  private _pathTemplateCallback: PathTemplateCallback;
  private _pathTemplateRegExp: RegExp;
  private _queryParams: PlainObject;
  private _requestRetryWait: number;
  private _requestTracker: RequestTracker = { active: [], pending: new Map() };
  private _streamReader: StreamReader;

  constructor(options: ConstructorOptions) {
    const {
      basePath,
      bodyParser = DEFAULT_BODY_PARSER,
      cache,
      enableConditionalRequests = true,
      fetchTimeout = DEFAULT_FETCH_TIMEOUT,
      headers,
      maxRedirects = DEFAULT_MAX_REDIRECTS,
      maxRetries = DEFAULT_MAX_RETRIES,
      optionalPathTemplateRegExp = OPTIONAL_PATH_TEMPLATE_REGEX,
      pathTemplateCallback = defaultPathTemplateCallback,
      pathTemplateRegExp = DEFAULT_PATH_TEMPLATE_REGEX,
      queryParams = {},
      requestRetryWait = DEFAULT_REQUEST_RETRY_WAIT,
      streamReader = JSON_FORMAT,
    } = options;

    if (!basePath) {
      throw new Error(MISSING_BASE_PATH_ERROR);
    }

    this._basePath = basePath;
    this._bodyParser = bodyParser;
    this._cache = cache;
    this._conditionalRequestsEnabled = enableConditionalRequests;
    this._fetchTimeout = fetchTimeout;
    this._headers = { ...DEFAULT_HEADERS, ...(headers || {}) };
    this._maxRedirects = maxRedirects;
    this._maxRetries = maxRetries;
    this._optionalPathTemplateRegExp = optionalPathTemplateRegExp;
    this._pathTemplateCallback = pathTemplateCallback;
    this._pathTemplateRegExp = pathTemplateRegExp;
    this._queryParams = queryParams;
    this._requestRetryWait = requestRetryWait;
    this._streamReader = streamReader;
  }

  get cache(): Cachemap | undefined {
    return this._cache;
  }

  public createShortcut(name: string, path: string, { method, ...rest }: Required<RequestOptions, "method">) {
    if (!FETCH_METHODS.includes(method)) {
      throw new Error(`${INVALID_FETCH_METHOD_ERROR} ${method}`);
    }

    // @ts-ignore
    this[name] = async <Resource extends PlainObject>({ method: requestMethod, ...requestRest }: RequestOptions = {}) =>
      // @ts-ignore
      this[requestMethod ?? method](path, merge({}, rest, requestRest)) as Promise<FetchResponse<Resource>>;
  }

  public async delete(path: string, options: Omit<RequestOptions, "method"> = {}) {
    return this._delete(path, options);
  }

  public async get(path: string, options: Omit<RequestOptions, "method"> = {}) {
    return this._get(path, options);
  }

  public async post(path: string, options: Omit<Required<RequestOptions, "body">, "method">) {
    return this._request(path, { ...options, method: POST_METHOD });
  }

  public async put(path: string, options: Omit<Required<RequestOptions, "body">, "methood">) {
    return this._request(path, { ...options, method: PUT_METHOD });
  }

  private async _cacheEntryDelete(requestHash: string): Promise<boolean> {
    if (!this._cache) return false;

    try {
      return await this._cache.delete(requestHash);
    } catch (errors) {
      return Promise.reject(errors);
    }
  }

  private async _cacheEntryGet(requestHash: string): Promise<PlainObject | undefined> {
    if (!this._cache) return undefined;

    try {
      return await this._cache.get(requestHash);
    } catch (errors) {
      return Promise.reject(errors);
    }
  }

  private async _cacheEntryHas(requestHash: string): Promise<Cacheability | false> {
    if (!this._cache) return false;

    try {
      return await this._cache.has(requestHash);
    } catch (error) {
      return false;
    }
  }

  private async _cacheEntrySet(requestHash: string, data: PlainObject, cacheHeaders: CacheHeaders): Promise<void> {
    if (!this._cache) return undefined;

    try {
      return await this._cache.set(requestHash, data, { cacheHeaders });
    } catch (error) {
      return Promise.reject(error);
    }
  }

  private async _delete(
    path: string,
    { headers = {}, pathTemplateData, queryParams = {}, ...rest }: Omit<RequestOptions, "method">,
  ) {
    const endpoint = buildEndpoint(this._basePath, path, {
      optionalPathTemplateRegExp: this._optionalPathTemplateRegExp,
      pathTemplateCallback: this._pathTemplateCallback,
      pathTemplateData,
      pathTemplateRegExp: this._pathTemplateRegExp,
      queryParams: { ...this._queryParams, ...queryParams },
    });

    const requestHash = md5(endpoint);
    const cacheability = await this._cacheEntryHas(requestHash);

    if (cacheability) {
      this._cacheEntryDelete(requestHash);
    }

    return this._fetch(endpoint, {
      headers: { ...this._headers, ...headers },
      method: DELETE_METHOD,
      ...rest,
    });
  }

  private async _fetch(endpoint: string, { redirects, retries, ...rest }: FetchOptions): Promise<FetchResponse> {
    try {
      return new Promise(async (resolve: (value: FetchResponse) => void, reject) => {
        const fetchTimer = setTimeout(() => {
          reject(new Error(`${FETCH_TIMEOUT_ERROR} ${this._fetchTimeout}ms.`));
        }, this._fetchTimeout);

        const res = await fetch(endpoint, rest);

        clearTimeout(fetchTimer);

        const { headers, status } = res;
        const responseGroup = getResponseGroup(status);

        if (responseGroup === REDIRECTION_REPSONSE && headers.get(LOCATION_HEADER)) {
          resolve(
            await this._fetchRedirectHandler(headers.get(LOCATION_HEADER) as string, {
              redirects,
              status,
              ...rest,
            }),
          );
        }

        if (responseGroup === SERVER_ERROR_REPSONSE) {
          resolve(
            (await this._fetchRetryHandler(endpoint, {
              retries,
              ...rest,
            })) as FetchResponse,
          );
        }

        const fetchRes = res as FetchResponse;
        fetchRes.data = res.body ? this._bodyParser(await res[this._streamReader]()) : undefined;
        resolve(fetchRes);
      });
    } catch (error) {
      const errorRes = { errors: [error] };
      return errorRes as FetchResponse;
    }
  }

  private async _fetchRedirectHandler(
    endpoint: string,
    { method, redirects = 1, status, ...rest }: FetchRedirectHandlerOptions,
  ): Promise<FetchResponse> {
    if (redirects === this._maxRedirects) {
      const errorRes = {
        errors: [new Error(`${MAX_REDIRECTS_EXCEEDED_ERROR} ${this._maxRedirects}.`)],
      };

      return errorRes as FetchResponse;
    }

    redirects += 1;
    const redirectMethod = status === 303 ? GET_METHOD : method;
    return this._fetch(endpoint, { method: redirectMethod, redirects, ...rest });
  }

  private async _fetchRetryHandler(endpoint: string, { retries = 1, ...rest }: FetchOptions) {
    if (retries === this._maxRetries) {
      return {
        errors: [new Error(`${MAX_RETRIES_EXCEEDED_ERROR} ${this._maxRetries}.`)],
      };
    }

    retries += 1;
    await delay(this._requestRetryWait);
    return this._fetch(endpoint, { retries, ...rest });
  }

  private async _get(
    path: string,
    { headers = {}, pathTemplateData, queryParams = {} }: Omit<RequestOptions, "method">,
  ) {
    const endpoint = buildEndpoint(this._basePath, path, {
      optionalPathTemplateRegExp: this._optionalPathTemplateRegExp,
      pathTemplateCallback: this._pathTemplateCallback,
      pathTemplateData,
      pathTemplateRegExp: this._pathTemplateRegExp,
      queryParams: { ...this._queryParams, ...queryParams },
    });

    const requestHash = md5(endpoint);
    const cacheability = await this._cacheEntryHas(requestHash);

    if (cacheability) {
      if (isCacheabilityValid(cacheability)) {
        return {
          data: await this._cacheEntryGet(requestHash),
          headers: new Headers({ "cache-control": cacheability.printCacheControl() }),
        };
      }

      if (this._conditionalRequestsEnabled) {
        const etag = cacheability?.metadata?.etag ?? null;
        if (etag) headers[IF_NONE_MATCH_HEADER] = etag;
      }
    }

    const pendingRequest = this._trackRequest(requestHash);
    if (pendingRequest) return pendingRequest;

    return this._getResolve(
      requestHash,
      await this._fetch(endpoint, { headers: { ...this._headers, ...headers }, method: GET_METHOD }),
    );
  }

  private async _getResolve(requestHash: string, res: FetchResponse) {
    const { data, headers, status } = res;

    if (status === NOT_FOUND_STATUS_CODE) {
      this._cacheEntryDelete(requestHash);

      if (!res.errors) {
        res.errors = [];
      }

      res.errors.push(new Error(RESOURCE_NOT_FOUND_ERROR));
    } else if (status === NOT_MODIFIED_STATUS_CODE && headers) {
      const cachedData = await this._cacheEntryGet(requestHash);

      if (cachedData) {
        this._cacheEntrySet(requestHash, cachedData, {
          cacheControl: headers.get(CACHE_CONTROL_HEADER) || undefined,
          etag: headers.get(ETAG_HEADER) || undefined,
        });

        res.data = cachedData;
      }
    } else if (data && headers) {
      this._cacheEntrySet(requestHash, data, {
        cacheControl: headers.get(CACHE_CONTROL_HEADER) || undefined,
        etag: headers.get(ETAG_HEADER) || undefined,
      });
    }

    this._resolvePendingRequests(requestHash, res);
    this._requestTracker.active = this._requestTracker.active.filter(value => value !== requestHash);
    return res;
  }

  private async _request(
    path: string,
    { body, headers, method, pathTemplateData, queryParams, ...rest }: Required<RequestOptions, "method">,
  ) {
    const endpoint = buildEndpoint(this._basePath, path, {
      optionalPathTemplateRegExp: this._optionalPathTemplateRegExp,
      pathTemplateCallback: this._pathTemplateCallback,
      pathTemplateData,
      pathTemplateRegExp: this._pathTemplateRegExp,
      queryParams: { ...this._queryParams, ...queryParams },
    });

    return this._fetch(endpoint, {
      body,
      headers: { ...this._headers, ...headers },
      method,
      ...rest,
    });
  }

  private _resolvePendingRequests(requestHash: string, responseData: FetchResponse) {
    const pendingRequests = this._requestTracker.pending.get(requestHash);
    if (!pendingRequests) return;

    pendingRequests.forEach(({ resolve }) => {
      resolve(responseData);
    });

    this._requestTracker.pending.delete(requestHash);
  }

  private _setPendingRequest(requestHash: string, resolver: PendingRequestResolvers) {
    let pending = this._requestTracker.pending.get(requestHash);
    if (!pending) pending = [];
    pending.push(resolver);
    this._requestTracker.pending.set(requestHash, pending);
  }

  private _trackRequest(requestHash: string): Promise<FetchResponse> | void {
    if (this._requestTracker.active.includes(requestHash)) {
      return new Promise((resolve: PendingRequestResolver) => {
        this._setPendingRequest(requestHash, { resolve });
      });
    }

    this._requestTracker.active.push(requestHash);
  }
}

export default function createRestClient<N extends string>(options: ConstructorOptions, shortcuts?: Shortcuts) {
  const getta = new Getta(options) as Getta & ShortcutProperties<N>;
  if (!shortcuts) return getta;

  Object.keys(shortcuts).forEach(key => {
    getta.createShortcut(key, ...shortcuts[key]);
  });

  return getta;
}
