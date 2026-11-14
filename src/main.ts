import { type Core, type GetOptions, type SetOptions } from '@cachemap/core';
import { mergeDeep } from 'remeda';
import { type SetRequired } from 'type-fest';
import { generateCacheKey } from '#helpers/generateCacheKey.ts';
import { isFetchResponse } from '#helpers/isFetchResponse.ts';
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
  type HeadersFactory,
  type Log,
  type MetadataExtensions,
  type PathTemplateCallback,
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

const headersToRecord = (headers: Headers): Record<string, string> => {
  const result: Record<string, string> = {};

  headers.forEach((value, name) => {
    result[name] = value;
  });

  return result;
};

export class Getta {
  private readonly _basePath: string;
  private readonly _bodyParser: Func;
  private readonly _cache?: Core;
  private readonly _conditionalRequestsEnabled: boolean;
  private readonly _fetchTimeout: number;
  private readonly _headers: Record<string, string> | HeadersFactory;
  private readonly _log: Log | undefined;
  private readonly _maxRedirects: number;
  private readonly _maxRetries: number;
  private readonly _optionalPathTemplateRegExp: RegExp;
  private readonly _pathTemplateCallback: PathTemplateCallback;
  private readonly _pathTemplateRegExp: RegExp;
  private readonly _performance: Performance;
  private readonly _queryParams: SearchParams;
  private readonly _rateLimit: boolean;
  private _rateLimitCount = 0;
  private _rateLimitedRequestQueue: RequestQueue<unknown> = [];
  private readonly _rateLimitPerSecond: number;
  private _rateLimitTimer?: ReturnType<typeof setTimeout>;
  private readonly _requestRetryWait: number;
  private readonly _requestTracker: RequestTracker = { active: new Set(), pending: new Map() };
  private readonly _streamReader: StreamReader;

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
    this._headers = typeof headers === 'function' ? headers : { ...consts.DEFAULT_HEADERS, ...headers };
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

  private _addRequestToRateLimitedQueue<T>(callback: () => Promise<FetchResponse<T>>): Promise<FetchResponse<T>> {
    return new Promise((resolve: (value: FetchResponse<T>) => void, reject: (error: unknown) => void) => {
      // @ts-expect-error Struggle to line up types in this situation
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

  private _cacheEntrySet(cacheKey: string, data: unknown, cacheOptions: SetOptions): void {
    if (!this._cache) {
      return;
    }

    this._cache.set(cacheKey, data, cacheOptions);
  }

  private async _createFetchResponse<T>(res: Response): Promise<FetchResponse<T>> {
    Object.defineProperty(res, 'data', {
      enumerable: true,
      value: res.body ? this._bodyParser(await res[this._streamReader]()) : undefined,
      writable: true,
    });

    // FetchResponse adds the data property above
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return res as FetchResponse<T>;
  }

  private async _delete(
    path: string,
    { headers = {}, pathTemplateData, queryParams = {}, ...rest }: Omit<RequestOptions, 'method'>,
    context?: Context,
  ): Promise<FetchResponse> {
    let endpoint = buildEndpoint(this._basePath, path, {
      optionalPathTemplateRegExp: this._optionalPathTemplateRegExp,
      pathTemplateCallback: this._pathTemplateCallback,
      pathTemplateData,
      pathTemplateRegExp: this._pathTemplateRegExp,
    });

    endpoint = appendSearchParams(endpoint, this._queryParams, queryParams);

    const requestHeaders = this._resolveHeaders(headers);

    const cacheHeaders = Object.fromEntries(
      Object.entries(requestHeaders).map(([name, value]) => [name.toLowerCase(), value]),
    );

    const cacheKey = generateCacheKey(endpoint, cacheHeaders);
    const hasEntry = this._cacheEntryHas(cacheKey);

    if (hasEntry) {
      this._cacheEntryDelete(cacheKey);
    }

    return this._schedule(() =>
      this._fetch(
        endpoint,
        {
          headers: requestHeaders,
          method: consts.DELETE_METHOD,
          ...rest,
        },
        context,
      ),
    );
  }

  private async _executeFetch(
    endpoint: string,
    options: FetchOptions,
    context: Context = {},
    startTime = this._performance.now(),
  ): Promise<Response> {
    const { redirects, retries, ...rest } = options;
    const controller = new AbortController();

    const fetchTimer = setTimeout(() => {
      controller.abort();
    }, this._fetchTimeout);

    if (!redirects && !retries) {
      this._log?.(consts.FETCH_REQUEST_SENT, {
        context: {
          fetchMethod: rest.method,
          fetchRedirects: redirects,
          fetchRequestHeaders: rest.headers,
          fetchRetries: retries,
          fetchUrl: endpoint,
          logEntryName: consts.FETCH_REQUEST_SENT,
          ...context,
        },
        stats: { startTime },
      });
    }

    try {
      return await fetch(endpoint, { ...rest, signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`${consts.FETCH_TIMEOUT_ERROR} ${String(this._fetchTimeout)}ms.`, { cause: error });
      }

      throw error;
    } finally {
      clearTimeout(fetchTimer);
    }
  }

  private async _fetch<T>(
    endpoint: string,
    options: FetchOptions,
    context: Context = {},
    startTime = this._performance.now(),
  ): Promise<FetchResponse<T>> {
    try {
      const { redirects, retries, ...rest } = options;
      const res = await this._executeFetch(endpoint, options, context, startTime);
      const { headers, status } = res;
      const responseGroup = getResponseGroup(status);

      if (responseGroup === consts.REDIRECTION_RESPONSE && headers.has(consts.LOCATION_HEADER)) {
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
          startTime,
        );
      }

      if (responseGroup === consts.SERVER_ERROR_RESPONSE) {
        return await this._fetchRetryHandler<T>(
          res,
          endpoint,
          {
            retries,
            ...rest,
          },
          context,
          startTime,
        );
      }

      const fetchResponse = await this._createFetchResponse<T>(res);
      this._logResponse(fetchResponse, endpoint, options, context, startTime);
      return fetchResponse;
    } catch (error) {
      const endTime = this._performance.now();

      this._log?.(consts.FETCH_REQUEST_FAILED, {
        context: { fetchUrl: endpoint, logEntryName: consts.FETCH_REQUEST_FAILED, ...context },
        error: error instanceof Error ? error : new Error('There was a problem with the request', { cause: error }),
        stats: { duration: endTime - startTime, endTime, startTime },
      });

      throw error;
    }
  }

  private async _fetchRedirectHandler<T>(
    res: Response,
    endpoint: string,
    options: FetchRedirectHandlerOptions,
    context: Context,
    startTime: number,
  ): Promise<FetchResponse<T>> {
    const { method, redirects = 1, status, ...rest } = options;

    if (redirects === this._maxRedirects) {
      this._logResponse(res, endpoint, options, context, startTime);
      throw new Error(`${consts.MAX_REDIRECTS_EXCEEDED_ERROR} ${String(this._maxRedirects)}.`);
    }

    const redirectMethod = status === 303 ? consts.GET_METHOD : method;

    return this._schedule(() =>
      this._fetch<T>(endpoint, { method: redirectMethod, redirects: redirects + 1, ...rest }, context, startTime),
    );
  }

  private async _fetchRetryHandler<T>(
    res: Response,
    endpoint: string,
    options: FetchOptions,
    context: Context,
    startTime: number,
  ): Promise<FetchResponse<T>> {
    const { retries = 1, ...rest } = options;

    if (retries === this._maxRetries) {
      this._logResponse(res, endpoint, options, context, startTime);
      throw new Error(`${consts.MAX_RETRIES_EXCEEDED_ERROR} ${String(this._maxRetries)}.`);
    }

    await delay(this._requestRetryWait);
    return this._schedule(() => this._fetch<T>(endpoint, { retries: retries + 1, ...rest }, context, startTime));
  }

  private async _get<T>(
    path: string,
    { headers = {}, pathTemplateData, queryParams = {} }: Omit<RequestOptions, 'method'>,
    context?: Context,
  ): Promise<FetchResponse<T>> {
    let endpoint = buildEndpoint(this._basePath, path, {
      optionalPathTemplateRegExp: this._optionalPathTemplateRegExp,
      pathTemplateCallback: this._pathTemplateCallback,
      pathTemplateData,
      pathTemplateRegExp: this._pathTemplateRegExp,
    });

    endpoint = appendSearchParams(endpoint, this._queryParams, queryParams);

    const requestHeaders = this._resolveHeaders(headers);

    const cacheHeaders = Object.fromEntries(
      Object.entries(requestHeaders).map(([name, value]) => [name.toLowerCase(), value]),
    );

    const cacheKey = generateCacheKey(endpoint, cacheHeaders);
    const entry = this._cache?.getMetadataEntry<MetadataExtensions>(cacheKey);

    if (entry?.cacheability.checkTTL()) {
      const cachedHeaders = {
        ...entry.extensions?.responseHeaders,
        'cache-control': entry.cacheability.printCacheControl(),
      };

      const data = this._cacheEntryGet<T>(cacheKey);

      this._log?.(consts.FETCH_RESPONSE_FROM_CACHE, {
        context: {
          fetchMethod: consts.GET_METHOD,
          fetchResponseHeaders: cachedHeaders,
          fetchUrl: endpoint,
          logEntryName: consts.FETCH_RESPONSE_FROM_CACHE,
          ...context,
        },
        data,
      });

      const responseHeaders = new Headers(cachedHeaders);

      const response = new Response(undefined, {
        headers: responseHeaders,
        status: entry.extensions?.status ?? 200,
        statusText: entry.extensions?.statusText,
      });

      Object.defineProperty(response, 'data', { enumerable: true, value: data, writable: true });

      // Cache hits use a synthetic Response with the metadata preserved at cache time.
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return response as FetchResponse<T>;
    }

    if (this._conditionalRequestsEnabled && entry?.extensions?.etag) {
      requestHeaders[consts.IF_NONE_MATCH_HEADER] = entry.extensions.etag;
    }

    const pendingRequest = this._trackRequest<T>(cacheKey);

    if (pendingRequest) {
      return pendingRequest;
    }

    const getResolve = async (): Promise<FetchResponse<T>> => {
      try {
        return this._getResolve<T>(
          cacheKey,
          await this._fetch<T>(endpoint, { headers: requestHeaders, method: consts.GET_METHOD }, context),
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

  private _getResolve<T>(cacheKey: string, res: FetchResponse<T>): FetchResponse<T> {
    const { data, headers, status } = res;

    if (status === consts.NOT_FOUND_STATUS_CODE) {
      this._cacheEntryDelete(cacheKey);
      throw new Error(consts.RESOURCE_NOT_FOUND_ERROR);
    }

    if (status === consts.NOT_MODIFIED_STATUS_CODE) {
      const cachedData = this._cacheEntryGet<T>(cacheKey, { ignoreCacheExpiry: true });
      const cachedMetadata = this._cache?.getMetadataEntry<MetadataExtensions>(cacheKey)?.extensions;

      if (cachedData !== undefined) {
        this._cacheEntrySet(cacheKey, cachedData, {
          cacheOptions: {
            headers,
          },
          extensions: {
            etag: headers.get(consts.ETAG_HEADER) ?? undefined,
            responseHeaders: { ...cachedMetadata?.responseHeaders, ...headersToRecord(headers) },
            status: cachedMetadata?.status ?? 200,
            statusText: cachedMetadata?.statusText ?? 'OK',
          },
        });

        res.data = cachedData;
      }
    } else if (data !== undefined) {
      this._cacheEntrySet(cacheKey, data, {
        cacheOptions: {
          headers,
        },
        extensions: {
          etag: headers.get(consts.ETAG_HEADER) ?? undefined,
          responseHeaders: headersToRecord(headers),
          status,
          statusText: res.statusText,
        },
      });
    }

    this._resolvePendingRequests(cacheKey, res);
    return res;
  }

  private _logResponse(
    res: Response | FetchResponse,
    endpoint: string,
    options: FetchOptions,
    context: Context,
    startTime: number,
  ): void {
    const { headers, status } = res;
    const { method, redirects, retries } = options;
    const endTime = this._performance.now();
    const duration = endTime - startTime;

    this._log?.(consts.FETCH_RESPONSE_RECEIVED, {
      context: {
        fetchMethod: method,
        fetchRedirects: redirects,
        fetchResponseHeaders: headersToRecord(headers),
        fetchResponseStatus: status,
        fetchRetries: retries,
        fetchUrl: endpoint,
        logEntryName: consts.FETCH_RESPONSE_RECEIVED,
        ...context,
      },
      stats: { duration, endTime, startTime },
      ...(isFetchResponse(res) && { data: res.data }),
    });
  }

  private _rejectPendingRequests(cacheKey: string, error: Error): void {
    const pendingRequests = this._requestTracker.pending.get(cacheKey);

    if (!pendingRequests) {
      return;
    }

    for (const { reject } of pendingRequests) {
      reject(error);
    }

    this._requestTracker.pending.delete(cacheKey);
  }

  private _releaseRateLimitedRequestQueue(): void {
    while (this._rateLimitedRequestQueue.length > 0 && this._rateLimitCount < this._rateLimitPerSecond) {
      const available = this._rateLimitPerSecond - this._rateLimitCount;

      if (available <= 0) {
        return;
      }

      const queue = [...this._rateLimitedRequestQueue];
      this._rateLimitedRequestQueue = [];
      const forProcessing = queue.slice(0, available);
      const remaining = queue.slice(available);

      for (const [resolve, reject, callback] of forProcessing) {
        this._startRateLimit();

        try {
          const processRequest = async (): Promise<void> => {
            try {
              resolve(await callback());
            } catch (error) {
              reject(error);
            }
          };

          void processRequest();
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
  ): Promise<FetchResponse> {
    let endpoint = buildEndpoint(this._basePath, path, {
      optionalPathTemplateRegExp: this._optionalPathTemplateRegExp,
      pathTemplateCallback: this._pathTemplateCallback,
      pathTemplateData,
      pathTemplateRegExp: this._pathTemplateRegExp,
    });

    endpoint = appendSearchParams(endpoint, this._queryParams, queryParams);

    const requestHeaders = this._resolveHeaders(headers);

    return this._schedule(() =>
      this._fetch(
        endpoint,
        {
          body,
          headers: requestHeaders,
          method,
          ...rest,
        },
        context,
      ),
    );
  }

  private _resolveHeaders(overrides: Record<string, string> = {}): Record<string, string> {
    const defaults = typeof this._headers === 'function' ? this._headers() : this._headers;

    const merged = new Map<string, [string, string]>();

    for (const source of [consts.DEFAULT_HEADERS, defaults, overrides]) {
      for (const [name, value] of Object.entries(source)) {
        merged.set(name.toLowerCase(), [name, value]);
      }
    }

    return Object.fromEntries(merged.values());
  }

  private _resolvePendingRequests(cacheKey: string, responseData: FetchResponse): void {
    const pendingRequests = this._requestTracker.pending.get(cacheKey);

    if (!pendingRequests) {
      return;
    }

    for (const { resolve } of pendingRequests) {
      resolve(responseData);
    }

    this._requestTracker.pending.delete(cacheKey);
  }

  private async _schedule<T>(callback: () => Promise<FetchResponse<T>>): Promise<FetchResponse<T>> {
    if (this._rateLimit && this._rateLimitCount >= this._rateLimitPerSecond) {
      return this._addRequestToRateLimitedQueue(callback);
    }

    this._startRateLimit();
    return await callback();
  }

  private _setPendingRequest(cacheKey: string, resolver: PendingRequestResolvers): void {
    let pending = this._requestTracker.pending.get(cacheKey);
    pending ??= [];
    pending.push(resolver);
    this._requestTracker.pending.set(cacheKey, pending);
  }

  private _startRateLimit(): void {
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

  private _trackRequest<T>(cacheKey: string): Promise<FetchResponse<T>> | undefined {
    if (this._requestTracker.active.has(cacheKey)) {
      return new Promise((resolve: (response: FetchResponse<T>) => void, reject) => {
        this._setPendingRequest(cacheKey, { reject, resolve });
      });
    }

    this._requestTracker.active.add(cacheKey);
    return;
  }

  get cache(): Core | undefined {
    return this._cache;
  }

  public createShortcut(
    name: string,
    path: string,
    { method, ...otherOptions }: SetRequired<RequestOptions, 'method'>,
  ): void {
    if (Reflect.has(this, name)) {
      throw new Error(`Shortcut "${name}" already exists`);
    }

    if (!consts.HTTP_METHODS.includes(method)) {
      throw new Error(`${consts.INVALID_FETCH_METHOD_ERROR} ${method}`);
    }

    // Struggle to type this well
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    (this as unknown as PlainObject)[name] = async <Resource extends PlainObject>(
      { method: requestMethod, ...otherOptionOverrides }: RequestOptions = {},
      context?: Context,
    ): Promise<FetchResponse<Resource> | FetchResponse> => {
      const options = mergeDeep(otherOptions, otherOptionOverrides);
      const resolvedMethod = requestMethod ?? method;

      if (resolvedMethod === consts.GET_METHOD) {
        return this.get<Resource>(path, options, context);
      }

      if (resolvedMethod === consts.DELETE_METHOD) {
        return this.delete(path, options, context);
      }

      return this.request(path, { ...options, method: resolvedMethod }, context);
    };
  }

  public async delete(
    path: string,
    options: Omit<RequestOptions, 'method'> = {},
    context?: Context,
  ): Promise<FetchResponse> {
    return this._delete(path, options, context);
  }

  public async get<T>(
    path: string,
    options: Omit<RequestOptions, 'method'> = {},
    context?: Context,
  ): Promise<FetchResponse<T>> {
    return this._get<T>(path, options, context);
  }

  public async post(
    path: string,
    options: Omit<SetRequired<RequestOptions, 'body'>, 'method'>,
    context?: Context,
  ): Promise<FetchResponse> {
    return this._request(path, { ...options, method: consts.POST_METHOD }, context);
  }

  public async put(
    path: string,
    options: Omit<SetRequired<RequestOptions, 'body'>, 'method'>,
    context?: Context,
  ): Promise<FetchResponse> {
    return this._request(path, { ...options, method: consts.PUT_METHOD }, context);
  }

  public async request(
    path: string,
    options: SetRequired<RequestOptions, 'method'>,
    context?: Context,
  ): Promise<FetchResponse> {
    if (!consts.HTTP_METHODS.includes(options.method)) {
      throw new Error(`${consts.INVALID_FETCH_METHOD_ERROR} ${options.method}`);
    }

    return this._request(path, options, context);
  }
}

export const createRestClient = <N extends string, LogData extends PlainObject = PlainObject>(
  options: ConstructorOptions<LogData>,
  shortcuts?: Shortcuts,
): Getta & ShortcutProperties<N> => {
  // @ts-expect-error Typing proving too complex without casting.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const getta = new Getta(options) as Getta & ShortcutProperties<N>;

  if (!shortcuts) {
    return getta;
  }

  for (const [key, shortcut] of Object.entries(shortcuts)) {
    getta.createShortcut(key, ...shortcut);
  }

  return getta;
};
