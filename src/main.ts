import { type Core, type GetOptions, type SetOptions } from '@cachemap/core';
import { merge } from 'lodash-es';
import { type SetRequired } from 'type-fest';
import { generateCacheKey } from '#helpers/generateCacheKey.ts';
import * as consts from './constants.ts';
import { appendSearchParams, buildEndpoint } from './helpers/buildEndpoint/index.ts';
import { defaultPathTemplateCallback } from './helpers/defaultPathTemplateCallback/index.ts';
import { delay } from './helpers/delay/index.ts';
import { getResponseGroup } from './helpers/getResponseGroup/index.ts';
import {
  type ConstructorOptions,
  type Context,
  type FetchOptions,
  type FetchRedirectHandlerOptions,
  type FetchResponse,
  type Func,
  type Log,
  type MetadataExtensions,
  type PathTemplateCallback,
  type PendingRequestResolver,
  type PendingRequestResolvers,
  type Performance,
  type PlainObject,
  type RequestOptions,
  type RequestQueue,
  type RequestTracker,
  type SearchParams,
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
  private _queryParams: SearchParams;
  private _rateLimit: boolean;
  private _rateLimitCount = 0;
  private _rateLimitedRequestQueue: RequestQueue<unknown> = [];
  private _rateLimitPerSecond: number;
  private _rateLimitTimer?: ReturnType<typeof setTimeout>;
  private _requestRetryWait: number;
  private _requestTracker: RequestTracker = { active: new Set(), pending: new Map() };
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
    if (name in this) {
      throw new Error(`Shortcut "${name}" already exists`);
    }

    if (!consts.FETCH_METHODS.includes(method)) {
      throw new Error(`${consts.INVALID_FETCH_METHOD_ERROR} ${method}`);
    }

    // Struggle to type this well
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    (this as unknown as PlainObject)[name] = async <Resource extends PlainObject>(
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

  public async get<T>(
    path: string,
    options: Omit<RequestOptions, 'method'> = {},
    context?: Context,
  ): Promise<FetchResponse<T>> {
    // For ease of use for consumer, casting to passed in type as any
    // errors will be thrown.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return this._get<T>(path, options, context) as Promise<FetchResponse<T>>;
  }

  public async post(path: string, options: Omit<SetRequired<RequestOptions, 'body'>, 'method'>, context?: Context) {
    return this._request(path, { ...options, method: consts.POST_METHOD }, context);
  }

  public async put(path: string, options: Omit<SetRequired<RequestOptions, 'body'>, 'method'>, context?: Context) {
    return this._request(path, { ...options, method: consts.PUT_METHOD }, context);
  }

  private _addRequestToRateLimitedQueue<T>(callback: () => Promise<FetchResponse<T>>) {
    return new Promise((resolve: (value: FetchResponse<T>) => void, reject: (error: unknown) => void) => {
      // @ts-expect-error Struggling to line up types in this situation
      this._rateLimitedRequestQueue.push([resolve, reject, callback]);
    });
  }

  private _cacheEntryDelete(cacheKey: string): boolean {
    if (!this._cache) {
      return false;
    }

    return this._cache.delete(cacheKey);
  }

  private _cacheEntryGet<T = unknown>(cacheKey: string, options: GetOptions = {}): T | undefined {
    if (!this._cache) {
      return undefined;
    }

    return this._cache.get<T>(cacheKey, options);
  }

  private _cacheEntryHas(cacheKey: string): boolean {
    if (!this._cache) {
      return false;
    }

    return this._cache.has(cacheKey);
  }

  private _cacheEntrySet(cacheKey: string, data: unknown, setOptions: SetOptions): void {
    if (!this._cache) {
      return;
    }

    this._cache.set(cacheKey, data, setOptions);
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
    const cacheKey = generateCacheKey(endpoint, headers);
    const hasEntry = this._cacheEntryHas(cacheKey);

    if (hasEntry) {
      this._cacheEntryDelete(cacheKey);
    }

    return this._schedule(() =>
      this._fetch(
        endpoint,
        {
          headers: { ...this._headers, ...headers },
          method: consts.DELETE_METHOD,
          ...rest,
        },
        context,
      ),
    );
  }

  private async _executeFetch(endpoint: string, options: FetchOptions, context: Context = {}): Promise<Response> {
    const { redirects, retries, ...rest } = options;
    context.startTime = this._performance.now();
    const controller = new AbortController();

    const fetchTimer = setTimeout(() => {
      controller.abort();
    }, this._fetchTimeout);

    if (!redirects && !retries) {
      this._log?.(consts.REQUEST_SENT, {
        context: {
          fetchMethod: rest.method,
          fetchRedirects: redirects,
          fetchRequestHeaders: rest.headers,
          fetchRetries: retries,
          fetchUrl: endpoint,
          logEntryName: 'FETCH_REQUEST_SENT',
          ...context,
        },
        stats: { startTime: context.startTime },
      });
    }

    try {
      return await fetch(endpoint, { ...rest, signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`${consts.FETCH_TIMEOUT_ERROR} ${String(this._fetchTimeout)}ms.`);
      }

      throw error;
    } finally {
      clearTimeout(fetchTimer);
    }
  }

  private async _fetch<T>(endpoint: string, options: FetchOptions, context: Context = {}): Promise<FetchResponse<T>> {
    try {
      const { redirects, retries, ...rest } = options;
      const res = await this._executeFetch(endpoint, options, context);
      const { body, headers, status } = res;
      const responseGroup = getResponseGroup(status);

      if (responseGroup === consts.REDIRECTION_REPSONSE && headers.has(consts.LOCATION_HEADER)) {
        return await this._fetchRedirectHandler<T>(
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
        );
      }

      if (responseGroup === consts.SERVER_ERROR_REPSONSE) {
        return await this._fetchRetryHandler<T>(
          res,
          endpoint,
          {
            retries,
            ...rest,
          },
          context,
        );
      }

      Object.defineProperty(res, 'data', {
        enumerable: true,
        value: body ? this._bodyParser(await res[this._streamReader]()) : undefined,
        writable: true,
      });

      this._logResponse(res, endpoint, options, context);
      return res;
    } catch (error) {
      const { startTime, ...rest } = context;
      const endTime = this._performance.now();

      this._log?.(consts.REQUEST_FAILED, {
        context: { error, fetchUrl: endpoint, logEntryName: 'FETCH_REQUEST_FAILED', ...rest },
        stats: { duration: startTime ? endTime - startTime : 0, endTime, startTime },
      });

      throw error;
    }
  }

  private async _fetchRedirectHandler<T>(
    res: FetchResponse<T>,
    endpoint: string,
    options: FetchRedirectHandlerOptions,
    context: Context,
  ): Promise<FetchResponse<T>> {
    const { method, redirects = 1, status, ...rest } = options;

    if (redirects === this._maxRedirects) {
      this._logResponse(res, endpoint, options, context);
      throw new Error(`${consts.MAX_REDIRECTS_EXCEEDED_ERROR} ${String(this._maxRedirects)}.`);
    }

    const redirectMethod = status === 303 ? consts.GET_METHOD : method;

    return this._schedule(() =>
      this._fetch<T>(endpoint, { method: redirectMethod, redirects: redirects + 1, ...rest }),
    );
  }

  private async _fetchRetryHandler<T>(
    res: FetchResponse<T>,
    endpoint: string,
    options: FetchOptions,
    context: Context,
  ) {
    const { retries = 1, ...rest } = options;

    if (retries === this._maxRetries) {
      this._logResponse(res, endpoint, options, context);
      throw new Error(`${consts.MAX_RETRIES_EXCEEDED_ERROR} ${String(this._maxRetries)}.`);
    }

    await delay(this._requestRetryWait);
    return this._schedule(() => this._fetch<T>(endpoint, { retries: retries + 1, ...rest }));
  }

  private async _get<T>(
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
    const cacheKey = generateCacheKey(endpoint, headers);
    const entry = this._cache?.getMetadataEntry<MetadataExtensions>(cacheKey);

    if (entry?.cacheability.checkTTL()) {
      const newHeaders = {
        ...headers,
        'cache-control': entry.cacheability.printCacheControl(),
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
        data: this._cacheEntryGet<T>(cacheKey),
        headers: new Headers(newHeaders),
      };
    }

    if (this._conditionalRequestsEnabled && entry?.extensions?.etag) {
      headers[consts.IF_NONE_MATCH_HEADER] = entry.extensions.etag;
    }

    const pendingRequest = this._trackRequest(cacheKey);

    if (pendingRequest) {
      return pendingRequest;
    }

    const getResolve = async () => {
      try {
        return this._getResolve<T>(
          cacheKey,
          await this._fetch<T>(
            endpoint,
            { headers: { ...this._headers, ...headers }, method: consts.GET_METHOD },
            context,
          ),
        );
      } catch (error) {
        this._rejectPendingRequests(
          cacheKey,
          error instanceof Error ? error : new Error('Oops, something went wrong!'),
        );

        throw error;
      } finally {
        this._requestTracker.active.delete(cacheKey);
      }
    };

    return this._schedule(getResolve);
  }

  private _getResolve<T>(cacheKey: string, res: FetchResponse<T>) {
    const { data, headers, status } = res;

    if (status === consts.NOT_FOUND_STATUS_CODE) {
      this._cacheEntryDelete(cacheKey);
      throw new Error(consts.RESOURCE_NOT_FOUND_ERROR);
    } else if (status === consts.NOT_MODIFIED_STATUS_CODE) {
      const cachedData = this._cacheEntryGet<T>(cacheKey, { ignoreCacheExpiry: true });

      if (cachedData) {
        this._cacheEntrySet(cacheKey, cachedData, {
          cacheOptions: {
            headers,
          },
          extensions: {
            etag: headers.get(consts.ETAG_HEADER) ?? undefined,
          },
        });

        res.data = cachedData;
      }
    } else if (data) {
      this._cacheEntrySet(cacheKey, data, {
        cacheOptions: {
          headers,
        },
        extensions: {
          etag: headers.get(consts.ETAG_HEADER) ?? undefined,
        },
      });
    }

    this._resolvePendingRequests(cacheKey, res);
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

  private _rejectPendingRequests(cacheKey: string, error: Error) {
    const pendingRequests = this._requestTracker.pending.get(cacheKey);

    if (!pendingRequests) {
      return;
    }

    for (const { reject } of pendingRequests) {
      reject(error);
    }

    this._requestTracker.pending.delete(cacheKey);
  }

  private _releaseRateLimitedRequestQueue() {
    while (this._rateLimitedRequestQueue.length > 0 && this._rateLimitCount < this._rateLimitPerSecond) {
      const available = this._rateLimitPerSecond - this._rateLimitCount;

      if (available <= 0) {
        return;
      }

      const queue = [...this._rateLimitedRequestQueue];
      this._rateLimitedRequestQueue = [];
      const toProcess = queue.slice(0, available);
      const remaining = queue.slice(available);

      for (const [resolve, reject, callback] of toProcess) {
        this._startRateLimit();

        try {
          const result = callback();
          result.then(resolve, reject);
        } catch (error) {
          reject(error);
        }
      }

      if (remaining.length > 0) {
        this._rateLimitedRequestQueue.push(...remaining);
      }
    }
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

    return this._schedule(() =>
      this._fetch(
        endpoint,
        {
          body,
          headers: { ...this._headers, ...headers },
          method,
          ...rest,
        },
        context,
      ),
    );
  }

  private _resolvePendingRequests(cacheKey: string, responseData: FetchResponse) {
    const pendingRequests = this._requestTracker.pending.get(cacheKey);

    if (!pendingRequests) {
      return;
    }

    for (const { resolve } of pendingRequests) {
      resolve(responseData);
    }

    this._requestTracker.pending.delete(cacheKey);
  }

  private async _schedule<T>(callback: () => Promise<FetchResponse<T>>) {
    if (this._rateLimit && this._rateLimitCount >= this._rateLimitPerSecond) {
      return this._addRequestToRateLimitedQueue(callback);
    }

    this._startRateLimit();
    return await callback();
  }

  private _setPendingRequest(cacheKey: string, resolver: PendingRequestResolvers) {
    let pending = this._requestTracker.pending.get(cacheKey);
    pending ??= [];
    pending.push(resolver);
    this._requestTracker.pending.set(cacheKey, pending);
  }

  private _startRateLimit() {
    if (!this._rateLimit) {
      return;
    }

    this._rateLimitTimer ??= setTimeout(() => {
      this._rateLimitTimer = undefined;
      this._rateLimitCount = 0;

      if (this._rateLimitedRequestQueue.length > 0) {
        this._releaseRateLimitedRequestQueue();
      }
    }, 1000);

    this._rateLimitCount += 1;
  }

  private _trackRequest(cacheKey: string): Promise<FetchResponse> | undefined {
    if (this._requestTracker.active.has(cacheKey)) {
      return new Promise((resolve: PendingRequestResolver, reject) => {
        this._setPendingRequest(cacheKey, { reject, resolve });
      });
    }

    this._requestTracker.active.add(cacheKey);
    return;
  }
}

export const createRestClient = <N extends string, LogData extends PlainObject = PlainObject>(
  options: ConstructorOptions<LogData>,
  shortcuts?: Shortcuts,
) => {
  // @ts-expect-error Typing proving too complex without casting.
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
