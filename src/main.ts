import { type CacheHeaders, type Core } from '@cachemap/core';
import { type Cacheability } from 'cacheability';
import { castArray, merge } from 'lodash-es';
import { Md5 } from 'ts-md5';
import { type SetRequired } from 'type-fest';
import * as consts from './constants.ts';
import { appendSearchParams, buildEndpoint } from './helpers/buildEndpoint/index.ts';
import { defaultPathTemplateCallback } from './helpers/defaultPathTemplateCallback/index.ts';
import { delay } from './helpers/delay/index.ts';
import { getResponseGroup } from './helpers/getResponseGroup/index.ts';
import { isCacheabilityValid } from './helpers/isCacheabilityValid/index.ts';
import {
  type ConstructorOptions,
  type Context,
  type FetchOptions,
  type FetchRedirectHandlerOptions,
  type FetchResponse,
  type Func,
  type Log,
  type PathTemplateCallback,
  type PendingRequestResolver,
  type PendingRequestResolvers,
  type Performance,
  type PlainObject,
  type RequestOptions,
  type RequestQueue,
  type RequestTracker,
  type ShortcutProperties,
  type Shortcuts,
  type StreamReader,
} from './types.ts';

export class Getta {
  private _basePath: string;
  private _bodyParser: Func;
  private _cache?: Core;
  private _conditionalRequestsEnabled: boolean;
  private _fetchTimeout: number;
  private _headers: Record<string, string>;
  private _log: Log | undefined;
  private _maxRedirects: number;
  private _maxRetries: number;
  private _optionalPathTemplateRegExp: RegExp;
  private _pathTemplateCallback: PathTemplateCallback;
  private _pathTemplateRegExp: RegExp;
  private _performance: Performance;
  private _queryParams: Record<string, string> | ((endpoint: string) => Record<string, string>);
  private _rateLimit: boolean;
  private _rateLimitCount = 0;
  private _rateLimitedRequestQueue: RequestQueue = [];
  private _rateLimitPerSecond: number;
  private _rateLimitTimer: NodeJS.Timeout | undefined = undefined;
  private _requestRetryWait: number;
  private _requestTracker: RequestTracker = { active: [], pending: new Map() };
  private _streamReader: StreamReader;

  constructor(options: ConstructorOptions) {
    const {
      basePath,
      bodyParser = consts.DEFAULT_BODY_PARSER,
      cache,
      enableConditionalRequests = true,
      fetchTimeout = consts.DEFAULT_FETCH_TIMEOUT,
      headers,
      log,
      maxRedirects = consts.DEFAULT_MAX_REDIRECTS,
      maxRetries = consts.DEFAULT_MAX_RETRIES,
      optionalPathTemplateRegExp = consts.OPTIONAL_PATH_TEMPLATE_REGEX,
      pathTemplateCallback = defaultPathTemplateCallback,
      pathTemplateRegExp = consts.DEFAULT_PATH_TEMPLATE_REGEX,
      performance,
      queryParams = {},
      rateLimit = false,
      rateLimitPerSecond = consts.DEFAULT_RATE_LIMIT,
      requestRetryWait = consts.DEFAULT_REQUEST_RETRY_WAIT,
      streamReader = consts.JSON_FORMAT,
    } = options;

    if (!basePath) {
      throw new Error(consts.MISSING_BASE_PATH_ERROR);
    }

    this._basePath = basePath;
    this._bodyParser = bodyParser;
    this._cache = cache;
    this._conditionalRequestsEnabled = enableConditionalRequests;
    this._fetchTimeout = fetchTimeout;
    this._headers = { ...consts.DEFAULT_HEADERS, ...headers };
    this._log = log;
    this._maxRedirects = maxRedirects;
    this._maxRetries = maxRetries;
    this._optionalPathTemplateRegExp = optionalPathTemplateRegExp;
    this._pathTemplateCallback = pathTemplateCallback;
    this._pathTemplateRegExp = pathTemplateRegExp;
    this._performance = performance;
    this._queryParams = queryParams;
    this._rateLimit = rateLimit;
    this._rateLimitPerSecond = rateLimitPerSecond;
    this._requestRetryWait = requestRetryWait;
    this._streamReader = streamReader;
  }

  get cache(): Core | undefined {
    return this._cache;
  }

  public createShortcut(
    name: string,
    path: string,
    { method, ...otherOptions }: SetRequired<RequestOptions, 'method'>,
  ) {
    if (!consts.FETCH_METHODS.includes(method)) {
      throw new Error(`${consts.INVALID_FETCH_METHOD_ERROR} ${method}`);
    }

    // @ts-expect-error No index signature with a parameter of type 'string'
    this[name] = async <Resource extends PlainObject>(
      { method: requestMethod, ...otherOptionOverrides }: RequestOptions = {},
      context?: Context,
    ) =>
      // @ts-expect-error Type 'undefined' is not assignable to type 'BodyInit'
      // To generic and complex to type without casting.
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      this[requestMethod ?? method](path, merge({}, otherOptions, otherOptionOverrides), context) as Promise<
        FetchResponse<Resource>
      >;
  }

  public async delete(path: string, options: Omit<RequestOptions, 'method'> = {}, context?: Context) {
    return this._delete(path, options, context);
  }

  public async get(path: string, options: Omit<RequestOptions, 'method'> = {}, context?: Context) {
    return this._get(path, options, context);
  }

  public async post(path: string, options: Omit<SetRequired<RequestOptions, 'body'>, 'method'>, context?: Context) {
    return this._request(path, { ...options, method: consts.POST_METHOD }, context);
  }

  public async put(path: string, options: Omit<SetRequired<RequestOptions, 'body'>, 'methood'>, context?: Context) {
    return this._request(path, { ...options, method: consts.PUT_METHOD }, context);
  }

  private _addRequestToRateLimitedQueue(endpoint: string, options: FetchOptions, context: Context) {
    return new Promise((resolve: (value: FetchResponse) => void) => {
      this._rateLimitedRequestQueue.push([resolve, endpoint, options, context]);
    });
  }

  private async _cacheEntryDelete(requestHash: string): Promise<boolean> {
    if (!this._cache) {
      return false;
    }

    return this._cache.delete(requestHash);
  }

  private async _cacheEntryGet(requestHash: string): Promise<PlainObject | undefined> {
    if (!this._cache) {
      return undefined;
    }

    return this._cache.get(requestHash);
  }

  private async _cacheEntryHas(requestHash: string): Promise<Cacheability | false> {
    if (!this._cache) {
      return false;
    }

    try {
      return await this._cache.has(requestHash);
    } catch {
      return false;
    }
  }

  private async _cacheEntrySet(requestHash: string, data: PlainObject, cacheHeaders: CacheHeaders): Promise<void> {
    if (!this._cache) {
      return undefined;
    }

    return this._cache.set(requestHash, data, { cacheHeaders });
  }

  private async _delete(
    path: string,
    { headers = {}, pathTemplateData, queryParams = {}, ...rest }: Omit<RequestOptions, 'method'>,
    context?: Context,
  ) {
    let endpoint = buildEndpoint(this._basePath, path, {
      optionalPathTemplateRegExp: this._optionalPathTemplateRegExp,
      pathTemplateCallback: this._pathTemplateCallback,
      pathTemplateData,
      pathTemplateRegExp: this._pathTemplateRegExp,
    });

    endpoint = appendSearchParams(endpoint, this._queryParams, queryParams);
    const requestHash = Md5.hashStr(endpoint);
    const cacheability = await this._cacheEntryHas(requestHash);

    if (cacheability) {
      void this._cacheEntryDelete(requestHash);
    }

    return this._fetch(
      endpoint,
      {
        headers: { ...this._headers, ...headers },
        method: consts.DELETE_METHOD,
        ...rest,
      },
      context,
    );
  }

  private async _fetch(endpoint: string, options: FetchOptions, context: Context = {}): Promise<FetchResponse> {
    context.startTime = this._performance.now();

    try {
      const { redirects, retries, ...rest } = options;

      return await new Promise<FetchResponse>((resolve, reject) => {
        void (async () => {
          const fetchTimer = setTimeout(() => {
            reject(new Error(`${consts.FETCH_TIMEOUT_ERROR} ${String(this._fetchTimeout)}ms.`));
          }, this._fetchTimeout);

          if (this._rateLimit) {
            this._startRateLimit();

            if (!(this._rateLimitCount < this._rateLimitPerSecond)) {
              clearTimeout(fetchTimer);
              resolve(await this._addRequestToRateLimitedQueue(endpoint, options, context));
              return;
            }
          }

          if (!redirects && !retries) {
            this._log?.(consts.REQUEST_SENT, {
              context: {
                fetchMethod: rest.method,
                fetchRedirets: redirects,
                fetchRequestHeaders: rest.headers,
                fetchRetries: retries,
                fetchUrl: endpoint,
                logEntryName: 'FETCH_REQUEST_SENT',
                ...context,
              },
              stats: { startTime: context.startTime },
            });
          }

          // Casting as fetch response does not support generics.
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          const res = (await fetch(endpoint, rest)) as FetchResponse;

          clearTimeout(fetchTimer);

          const { body, headers, status } = res;
          const responseGroup = getResponseGroup(status);

          if (responseGroup === consts.REDIRECTION_REPSONSE && headers.has(consts.LOCATION_HEADER)) {
            resolve(
              await this._fetchRedirectHandler(
                res,
                // Has check above means this cannot be undefined.
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                headers.get(consts.LOCATION_HEADER)!,
                {
                  redirects,
                  status,
                  ...rest,
                },
                context,
              ),
            );

            return;
          }

          if (responseGroup === consts.SERVER_ERROR_REPSONSE) {
            resolve(
              await this._fetchRetryHandler(
                res,
                endpoint,
                {
                  retries,
                  ...rest,
                },
                context,
              ),
            );

            return;
          }

          try {
            Object.defineProperty(res, 'data', {
              enumerable: true,

              value: body ? this._bodyParser(await res[this._streamReader]()) : undefined,
              writable: true,
            });

            this._logResponse(res, endpoint, options, context);
            resolve(res);
          } catch (error) {
            if (error instanceof Error) {
              reject(error);
            } else {
              reject(new Error(`Unable to ${rest.method} ${endpoint} due to previous error`));
            }
          }
        })();
      });
    } catch (error) {
      const { startTime, ...rest } = context;
      const endTime = this._performance.now();

      this._log?.(consts.REQUEST_FAILED, {
        context: { error, fetchUrl: endpoint, logEntryName: 'FETCH_REQUEST_FAILED', ...rest },
        stats: { duration: startTime ? endTime - startTime : 0, endTime, startTime },
      });

      // Based on above code, error is going to be a type of Error.
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return { errors: castArray(error) } as FetchResponse;
    }
  }

  private async _fetchRedirectHandler(
    res: FetchResponse,
    endpoint: string,
    options: FetchRedirectHandlerOptions,
    context: Context,
  ): Promise<FetchResponse> {
    const { method, redirects = 1, status, ...rest } = options;

    if (redirects === this._maxRedirects) {
      res.errors = [new Error(`${consts.MAX_REDIRECTS_EXCEEDED_ERROR} ${String(this._maxRedirects)}.`)];
      this._logResponse(res, endpoint, options, context);
      return res;
    }

    const redirectMethod = status === 303 ? consts.GET_METHOD : method;
    return this._fetch(endpoint, { method: redirectMethod, redirects: redirects + 1, ...rest });
  }

  private async _fetchRetryHandler(res: FetchResponse, endpoint: string, options: FetchOptions, context: Context) {
    const { retries = 1, ...rest } = options;

    if (retries === this._maxRetries) {
      res.errors = [new Error(`${consts.MAX_RETRIES_EXCEEDED_ERROR} ${String(this._maxRetries)}.`)];
      this._logResponse(res, endpoint, options, context);
      return res;
    }

    await delay(this._requestRetryWait);
    return this._fetch(endpoint, { retries: retries + 1, ...rest });
  }

  private async _get(
    path: string,
    { headers = {}, pathTemplateData, queryParams = {} }: Omit<RequestOptions, 'method'>,
    context?: Context,
  ) {
    let endpoint = buildEndpoint(this._basePath, path, {
      optionalPathTemplateRegExp: this._optionalPathTemplateRegExp,
      pathTemplateCallback: this._pathTemplateCallback,
      pathTemplateData,
      pathTemplateRegExp: this._pathTemplateRegExp,
    });

    endpoint = appendSearchParams(endpoint, this._queryParams, queryParams);

    const requestHash = Md5.hashStr(endpoint);
    const cacheability = await this._cacheEntryHas(requestHash);

    if (cacheability) {
      if (isCacheabilityValid(cacheability)) {
        const newHeaders = {
          ...headers,
          'cache-control': cacheability.printCacheControl(),
        };

        this._log?.(consts.RESPONSE_FROM_CACHE, {
          context: {
            fetchMethod: consts.GET_METHOD,
            fetchResponseHeaders: newHeaders,
            fetchUrl: endpoint,
            logEntryName: 'FETCH_RESPONSE_FROM_CACHE',
            ...context,
          },
        });

        return {
          data: await this._cacheEntryGet(requestHash),
          headers: new Headers(newHeaders),
        };
      }

      if (this._conditionalRequestsEnabled && cacheability.metadata.etag) {
        headers[consts.IF_NONE_MATCH_HEADER] = cacheability.metadata.etag;
      }
    }

    const pendingRequest = this._trackRequest(requestHash);

    if (pendingRequest) {
      return pendingRequest;
    }

    return this._getResolve(
      requestHash,
      await this._fetch(endpoint, { headers: { ...this._headers, ...headers }, method: consts.GET_METHOD }, context),
    );
  }

  private async _getResolve(requestHash: string, res: FetchResponse) {
    const { data, headers, status } = res;

    if (status === consts.NOT_FOUND_STATUS_CODE) {
      void this._cacheEntryDelete(requestHash);
      let { errors } = res;
      errors ??= [];
      errors.push(new Error(consts.RESOURCE_NOT_FOUND_ERROR));
      res.errors = errors;
    } else if (status === consts.NOT_MODIFIED_STATUS_CODE) {
      const cachedData = await this._cacheEntryGet(requestHash);

      if (cachedData) {
        void this._cacheEntrySet(requestHash, cachedData, {
          cacheControl: headers.get(consts.CACHE_CONTROL_HEADER) ?? undefined,
          etag: headers.get(consts.ETAG_HEADER) ?? undefined,
        });

        res.data = cachedData;
      }
    } else if (data) {
      void this._cacheEntrySet(requestHash, data, {
        cacheControl: headers.get(consts.CACHE_CONTROL_HEADER) ?? undefined,
        etag: headers.get(consts.ETAG_HEADER) ?? undefined,
      });
    }

    this._resolvePendingRequests(requestHash, res);
    this._requestTracker.active = this._requestTracker.active.filter(value => value !== requestHash);
    return res;
  }

  private _logResponse(res: FetchResponse, endpoint: string, options: FetchOptions, context: Context) {
    const { headers, status } = res;
    const { method, redirects, retries } = options;
    const { startTime, ...otherContext } = context;
    const endTime = this._performance.now();
    const duration = startTime ? endTime - startTime : 0;

    this._log?.(consts.RESPONSE_RECEIVED, {
      context: {
        fetchMethod: method,
        fetchRedirects: redirects,
        fetchResponseHeaders: Object.fromEntries(headers.entries()),
        fetchResponseStatus: status,
        fetchRetries: retries,
        fetchUrl: endpoint,
        logEntryName: 'FETCH_RESPONSE_RECEIVED',
        ...otherContext,
      },
      stats: { duration, endTime, startTime },
    });
  }

  private async _releaseRateLimitedRequestQueue() {
    for (const [resolve, endpoint, options, context] of this._rateLimitedRequestQueue) {
      resolve(await this._fetch(endpoint, options, context));
    }

    this._rateLimitedRequestQueue = [];
  }

  private async _request(
    path: string,
    { body, headers, method, pathTemplateData, queryParams, ...rest }: SetRequired<RequestOptions, 'method'>,
    context?: Context,
  ) {
    let endpoint = buildEndpoint(this._basePath, path, {
      optionalPathTemplateRegExp: this._optionalPathTemplateRegExp,
      pathTemplateCallback: this._pathTemplateCallback,
      pathTemplateData,
      pathTemplateRegExp: this._pathTemplateRegExp,
    });

    endpoint = appendSearchParams(endpoint, this._queryParams, queryParams);

    return this._fetch(
      endpoint,
      {
        body,
        headers: { ...this._headers, ...headers },
        method,
        ...rest,
      },
      context,
    );
  }

  private _resolvePendingRequests(requestHash: string, responseData: FetchResponse) {
    const pendingRequests = this._requestTracker.pending.get(requestHash);

    if (!pendingRequests) {
      return;
    }

    for (const { resolve } of pendingRequests) {
      resolve(responseData);
    }

    this._requestTracker.pending.delete(requestHash);
  }

  private _setPendingRequest(requestHash: string, resolver: PendingRequestResolvers) {
    let pending = this._requestTracker.pending.get(requestHash);
    pending ??= [];
    pending.push(resolver);
    this._requestTracker.pending.set(requestHash, pending);
  }

  private _startRateLimit() {
    this._rateLimitTimer ??= setTimeout(() => {
      this._rateLimitTimer = undefined;
      this._rateLimitCount = 0;

      if (this._rateLimitedRequestQueue.length > 0) {
        void this._releaseRateLimitedRequestQueue();
      }
    }, 1000);

    this._rateLimitCount += 1;
  }

  private _trackRequest(requestHash: string): Promise<FetchResponse> | undefined {
    if (this._requestTracker.active.includes(requestHash)) {
      return new Promise((resolve: PendingRequestResolver) => {
        this._setPendingRequest(requestHash, { resolve });
      });
    }

    this._requestTracker.active.push(requestHash);
    return;
  }
}

export const createRestClient = <N extends string>(options: ConstructorOptions, shortcuts?: Shortcuts) => {
  // Typing proving too complex without casting.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const getta = new Getta(options) as Getta & ShortcutProperties<N>;

  if (!shortcuts) {
    return getta;
  }

  for (const key of Object.keys(shortcuts)) {
    const shortcut = shortcuts[key];

    if (shortcut) {
      getta.createShortcut(key, ...shortcut);
    }
  }

  return getta;
};
