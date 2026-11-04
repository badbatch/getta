import { jest } from '@jest/globals';
import { mockFetch } from 'fetch-mocked';
import { performance } from 'node:perf_hooks';
import { PRD_136_7317 } from './__testUtils__/data/index.ts';
import {
  basePath,
  buildTestEndpoint,
  defaultEtag,
  defaultHeaders,
  defaultPath,
  defaultPathTemplateData,
  defaultPayload,
  getCache,
  graphqlPath,
  idPathTemplateData,
  pathTemplateDataWithoutID,
} from './__testUtils__/helpers/index.ts';
import * as consts from './constants.ts';
import { delay } from './helpers/delay/index.ts';
import { generateCacheKey } from './helpers/generateCacheKey.ts';
import { Getta, createRestClient } from './main.ts';
import { type LogData, type ShortcutProperties } from './types.ts';

const mockedFetch = mockFetch(jest.fn);

const getRejectedMessage = async (promise: Promise<unknown>) =>
  promise.then(
    () => '',
    (error: unknown) => (error instanceof Error ? error.message : String(error)),
  );

const hasInternalStartTime = (context: object | undefined) => (context ? Object.hasOwn(context, '__startTime') : false);

describe('Getta', () => {
  afterEach(() => {
    mockedFetch.mockReset();
  });

  describe('Given valid constructor options', () => {
    it('When createRestClient receives valid options, then it returns a Getta instance', () => {
      // Arrange
      const restClient = createRestClient({ basePath, cache: getCache(), performance });
      // Act
      const result = restClient;

      // Assert
      expect(result).toBeInstanceOf(Getta);
    });
  });

  describe('Given a client configured with a GET shortcut', () => {
    let restClient: Getta & ShortcutProperties<'getProduct'>;

    beforeEach(() => {
      restClient = createRestClient<'getProduct'>(
        { basePath, cache: getCache(), performance },
        {
          getProduct: [
            defaultPath,
            {
              method: consts.GET_METHOD,
              pathTemplateData: pathTemplateDataWithoutID,
            },
          ],
        },
      );
    });

    afterEach(() => {
      restClient.cache?.clear();
    });

    describe('Given a successful GET response', () => {
      beforeEach(() => {
        mockedFetch.mockGetOnce(buildTestEndpoint(defaultPath), {
          body: PRD_136_7317.body,
          headers: defaultHeaders,
        });
      });

      it('When GET is called, then it sends one request', async () => {
        // Act
        await restClient.get(defaultPath, { pathTemplateData: defaultPathTemplateData });

        // Assert
        expect(mockedFetch).toHaveBeenCalledTimes(1);
      });

      it('When GET receives a response, then it returns the parsed data', async () => {
        // Act
        const { data } = await restClient.get(defaultPath, { pathTemplateData: defaultPathTemplateData });

        // Assert
        expect(data).toEqual(PRD_136_7317.body);
      });
    });

    describe('Given a successful response to the GET shortcut', () => {
      beforeEach(() => {
        mockedFetch.mockGetOnce(buildTestEndpoint(defaultPath), {
          body: PRD_136_7317.body,
          headers: defaultHeaders,
        });
      });

      it('When the GET shortcut is called, then it sends one request', async () => {
        // Act
        await restClient.getProduct({ pathTemplateData: idPathTemplateData });

        // Assert
        expect(mockedFetch).toHaveBeenCalledTimes(1);
      });

      it('When the GET shortcut receives a response, then it returns the parsed data', async () => {
        // Act
        const { data } = await restClient.getProduct({ pathTemplateData: idPathTemplateData });

        // Assert
        expect(data).toEqual(PRD_136_7317.body);
      });
    });

    describe('Given a resource is in the cache', () => {
      describe('Given the cache entry has not expired', () => {
        beforeEach(async () => {
          mockedFetch.mockGetOnce(buildTestEndpoint(defaultPath), {
            body: PRD_136_7317.body,
            headers: defaultHeaders,
          });

          await restClient.getProduct({ pathTemplateData: idPathTemplateData });
          mockedFetch.mockClear();
        });

        it('When GET finds an unexpired cache entry, then it returns it without fetching', async () => {
          // Act
          await restClient.getProduct({ pathTemplateData: idPathTemplateData });

          // Assert
          expect(mockedFetch).not.toHaveBeenCalled();
        });

        it('When GET finds an unexpired cache entry, then it restores data and Response metadata', async () => {
          // Act
          const response = await restClient.getProduct({ pathTemplateData: idPathTemplateData });

          // Assert
          expect({
            cacheControlIncludesMaxAge: response.headers.get('cache-control')?.includes('max-age=6000'),
            contentType: response.headers.get('content-type'),
            data: response.data,
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
          }).toEqual({
            cacheControlIncludesMaxAge: true,
            contentType: 'application/json',
            data: PRD_136_7317.body,
            ok: true,
            status: 200,
            statusText: 'OK',
          });
        });
      });

      it('When clients use different default authorization headers, then they use separate cache entries', async () => {
        // Arrange
        const sharedCache = getCache();

        const clientA = createRestClient({
          basePath,
          cache: sharedCache,
          headers: { authorization: 'Bearer A' },
          performance,
        });

        const clientB = createRestClient({
          basePath,
          cache: sharedCache,
          headers: { authorization: 'Bearer B' },
          performance,
        });

        const clientAWithDifferentHeaderCase = createRestClient({
          basePath,
          cache: sharedCache,
          headers: { Authorization: 'Bearer A' },
          performance,
        });

        const url = `${basePath}/private`;

        mockedFetch.mockGetOnce(url, {
          body: { owner: 'A' },
          headers: { 'cache-control': 'public, max-age=6000' },
        });

        mockedFetch.mockGetOnce(url, {
          body: { owner: 'B' },
          headers: { 'cache-control': 'public, max-age=6000' },
        });

        // Act
        const responseA = await clientA.get<{ owner: string }>('/private');
        const responseB = await clientB.get<{ owner: string }>('/private');
        const cachedResponseA = await clientAWithDifferentHeaderCase.get<{ owner: string }>('/private');

        // Assert
        expect([
          responseA.data.owner,
          responseB.data.owner,
          cachedResponseA.data.owner,
          mockedFetch.mock.calls.length,
        ]).toEqual(['A', 'B', 'A', 2]);
      });

      it('When concurrent GETs use different authorization headers, then they do not share a request', async () => {
        // Arrange
        const authClient = createRestClient({ basePath, performance });
        const url = `${basePath}/private`;
        mockedFetch.mockGetOnce(url, { body: { owner: 'A' } });
        mockedFetch.mockGetOnce(url, { body: { owner: 'B' } });

        // Act
        const [responseA, responseB] = await Promise.all([
          authClient.get<{ owner: string }>('/private', { headers: { authorization: 'Bearer A' } }),
          authClient.get<{ owner: string }>('/private', { headers: { authorization: 'Bearer B' } }),
        ]);

        // Assert
        expect([responseA.data.owner, responseB.data.owner, mockedFetch.mock.calls.length]).toEqual(['A', 'B', 2]);
      });

      it('When GET returns cached data, then the cache-hit log includes it', async () => {
        // Arrange
        const cache = getCache();
        const logs: { data: LogData; message: string }[] = [];

        const loggedClient = createRestClient({
          basePath,
          cache,
          log: (message, data) => logs.push({ data, message }),
          performance,
        });

        const url = `${basePath}/cached`;
        const expectedData = { cached: true };

        mockedFetch.mockGetOnce(url, {
          body: expectedData,
          headers: { 'cache-control': 'public, max-age=6000' },
        });

        await loggedClient.get('/cached');
        mockedFetch.mockClear();

        // Act
        const response = await loggedClient.get('/cached');
        const cacheLog = logs.find(entry => entry.message === consts.FETCH_RESPONSE_FROM_CACHE);

        // Assert
        expect({
          cacheLogData: cacheLog?.data.data,
          cacheLogName: cacheLog?.data.context.logEntryName,
          fetchCount: mockedFetch.mock.calls.length,
          responseData: response.data,
        }).toEqual({
          cacheLogData: expectedData,
          cacheLogName: consts.FETCH_RESPONSE_FROM_CACHE,
          fetchCount: 0,
          responseData: expectedData,
        });
      });

      describe('Given the cache entry has expired', () => {
        beforeEach(async () => {
          mockedFetch.mockGetOnce(buildTestEndpoint(defaultPath), {
            body: PRD_136_7317.body,
            headers: { ...defaultHeaders, 'cache-control': 'public, max-age=1' },
          });

          await restClient.getProduct({ pathTemplateData: idPathTemplateData });
          await delay(1000);
          mockedFetch.mockClear();
        });

        describe('Given the server returns 304 Not Modified', () => {
          beforeEach(() => {
            const url = buildTestEndpoint(defaultPath);

            mockedFetch.mockGetOnce(
              { headers: { [consts.IF_NONE_MATCH_HEADER]: defaultEtag }, url },
              { headers: defaultHeaders, status: 304 },
            );
          });

          it('When GET finds an expired entry with an ETag, then it sends a conditional request', async () => {
            // Act
            await restClient.getProduct({ pathTemplateData: idPathTemplateData });

            // Assert
            expect(mockedFetch).toHaveBeenCalledTimes(1);
          });

          it('When the server returns 304, then GET returns cached data and preserves metadata for the next hit', async () => {
            // Act
            const revalidatedResponse = await restClient.getProduct({ pathTemplateData: idPathTemplateData });
            const cachedResponse = await restClient.getProduct({ pathTemplateData: idPathTemplateData });

            // Assert
            expect({
              cachedContentType: cachedResponse.headers.get('content-type'),
              cachedOk: cachedResponse.ok,
              cachedStatus: cachedResponse.status,
              fetchCount: mockedFetch.mock.calls.length,
              revalidatedData: revalidatedResponse.data,
              revalidatedStatus: revalidatedResponse.status,
            }).toEqual({
              cachedContentType: 'application/json',
              cachedOk: true,
              cachedStatus: 200,
              fetchCount: 1,
              revalidatedData: PRD_136_7317.body,
              revalidatedStatus: 304,
            });
          });
        });

        describe('Given the server returns a fresh resource', () => {
          beforeEach(() => {
            const url = buildTestEndpoint(defaultPath);
            mockedFetch.mockGetOnce({ url }, { body: PRD_136_7317.body, headers: defaultHeaders });
          });

          it('When GET receives a fresh resource, then it sends one request', async () => {
            // Act
            await restClient.getProduct({ pathTemplateData: idPathTemplateData });

            // Assert
            expect(mockedFetch).toHaveBeenCalledTimes(1);
          });

          it('When GET receives a fresh resource, then it returns that data', async () => {
            // Act
            const { data } = await restClient.getProduct({ pathTemplateData: idPathTemplateData });

            // Assert
            expect(data).toEqual(PRD_136_7317.body);
          });
        });

        describe('Given the server returns 404 Not Found', () => {
          beforeEach(() => {
            mockedFetch.mockGetOnce({ url: buildTestEndpoint(defaultPath) }, { status: 404 });
          });

          it('When GET receives a 404, then it rejects with the not-found error', async () => {
            // Act
            await expect(restClient.getProduct({ pathTemplateData: idPathTemplateData })).rejects.toThrow(
              'The requested resource could not been found.',
            );
          });

          it('When GET receives a 404 for a cached resource, then it removes the stale entry', async () => {
            // Arrange
            const cacheKey = generateCacheKey(buildTestEndpoint(defaultPath), { 'content-type': 'application/json' });

            // Act
            const wasRejected = await restClient.getProduct({ pathTemplateData: idPathTemplateData }).then(
              () => false,
              () => true,
            );

            // Assert
            expect({
              cacheEntryPresent: restClient.cache?.has(cacheKey),
              fetchCount: mockedFetch.mock.calls.length,
              wasRejected,
            }).toEqual({ cacheEntryPresent: false, fetchCount: 1, wasRejected: true });
          });
        });
      });

      describe('Given a redirect loop', () => {
        const REDIRECT_COOKIE_FLAG = 'status=redirect';

        beforeEach(() => {
          mockedFetch.mockGet(
            { headers: { [consts.COOKIE_HEADER]: REDIRECT_COOKIE_FLAG }, url: '*' },
            { headers: { ...defaultHeaders, [consts.LOCATION_HEADER]: basePath }, status: 301 },
          );
        });

        it('When GET encounters a redirect loop, then it stops after five requests', async () => {
          // Act
          const result = restClient.getProduct({
            headers: { [consts.COOKIE_HEADER]: REDIRECT_COOKIE_FLAG },
            pathTemplateData: idPathTemplateData,
          });

          // Assert
          const errorMessage = await getRejectedMessage(result);

          expect({
            fetchCount: mockedFetch.mock.calls.length,
            message: errorMessage,
          }).toEqual({
            fetchCount: 5,
            message: 'The request exceeded the maximum number of redirects, which is 5.',
          });
        });

        it('When GET exceeds the redirect limit, then it rejects with the limit error', async () => {
          // Act
          await expect(
            restClient.getProduct({
              headers: { [consts.COOKIE_HEADER]: REDIRECT_COOKIE_FLAG },
              pathTemplateData: idPathTemplateData,
            }),
          ).rejects.toThrow('The request exceeded the maximum number of redirects, which is 5');
        });
      });

      describe('Given the server repeatedly returns an error', () => {
        const RETRY_COOKIE_FLAG = 'status=retry';

        beforeEach(() => {
          mockedFetch.mockGet(
            { headers: { [consts.COOKIE_HEADER]: RETRY_COOKIE_FLAG }, url: buildTestEndpoint(defaultPath) },
            { body: PRD_136_7317.body, status: 500 },
          );
        });

        it('When GET repeatedly receives server errors, then it stops after three attempts', async () => {
          // Act
          const result = restClient.getProduct({
            headers: { [consts.COOKIE_HEADER]: RETRY_COOKIE_FLAG },
            pathTemplateData: idPathTemplateData,
          });

          // Assert
          const errorMessage = await getRejectedMessage(result);

          expect({
            fetchCount: mockedFetch.mock.calls.length,
            message: errorMessage,
          }).toEqual({
            fetchCount: 3,
            message: 'The request exceeded the maximum number of retries, which is 3.',
          });
        });

        it('When GET exceeds the retry limit, then it rejects with the limit error', async () => {
          // Act
          await expect(
            restClient.getProduct({
              headers: { [consts.COOKIE_HEADER]: RETRY_COOKIE_FLAG },
              pathTemplateData: idPathTemplateData,
            }),
          ).rejects.toThrow('The request exceeded the maximum number of retries, which is 3.');
        });
      });

      describe('Given the same resource is requested in quick succession', () => {
        beforeEach(() => {
          mockedFetch.mockGet(buildTestEndpoint(defaultPath), { body: PRD_136_7317.body, headers: defaultHeaders });
        });

        it('When GET is called concurrently for the same resource, then it makes one fetch', async () => {
          // Act
          await Promise.all([
            restClient.get(defaultPath, { pathTemplateData: defaultPathTemplateData }),
            restClient.get(defaultPath, { pathTemplateData: defaultPathTemplateData }),
          ]);

          // Assert
          expect(mockedFetch).toHaveBeenCalledTimes(1);
        });

        it('When concurrent GET calls share a fetch, then both callers receive its data', async () => {
          // Act
          const [{ data: dataA }, { data: dataB }] = await Promise.all([
            restClient.get(defaultPath, { pathTemplateData: defaultPathTemplateData }),
            restClient.get(defaultPath, { pathTemplateData: defaultPathTemplateData }),
          ]);

          // Assert
          expect([dataA, dataB]).toEqual([PRD_136_7317.body, PRD_136_7317.body]);
        });
      });

      describe('Given duplicate GET requests fail', () => {
        it('When a coalesced GET fails, then every waiting caller rejects', async () => {
          // Arrange
          const failingClient = createRestClient({
            basePath,
            maxRetries: 1,
            performance,
            requestRetryWait: 0,
          });

          mockedFetch.mockGetOnce(buildTestEndpoint(defaultPath), { status: 500 });

          // Act
          const results = await Promise.allSettled([
            failingClient.get(defaultPath, { pathTemplateData: defaultPathTemplateData }),
            failingClient.get(defaultPath, { pathTemplateData: defaultPathTemplateData }),
          ]);

          // Assert
          expect({
            fetchCount: mockedFetch.mock.calls.length,
            results: results.map(result => result.status),
          }).toEqual({ fetchCount: 1, results: ['rejected', 'rejected'] });
        });
      });

      describe('Given a request is retried', () => {
        it('When GET is retried, then logs preserve caller context and total timing without mutating it', async () => {
          // Arrange
          const context = { correlationId: 'request-123' };
          const logs: { data: LogData; message: string }[] = [];

          const testPerformance = {
            now: jest.fn<() => number>().mockReturnValueOnce(0).mockReturnValueOnce(12),
          };

          const loggedClient = createRestClient({
            basePath,
            log: (message, data) => logs.push({ data, message }),
            maxRetries: 2,
            performance: testPerformance,
            requestRetryWait: 0,
          });

          const url = buildTestEndpoint(defaultPath);
          mockedFetch.mockGetOnce(url, { status: 500 });
          mockedFetch.mockGetOnce(url, { body: PRD_136_7317.body, headers: defaultHeaders });

          // Act
          const response = await loggedClient.get(defaultPath, { pathTemplateData: defaultPathTemplateData }, context);
          const requestLog = logs.find(entry => entry.message === consts.FETCH_REQUEST_SENT);
          const responseLog = logs.find(entry => entry.message === consts.FETCH_RESPONSE_RECEIVED);

          // Assert
          expect({
            callerContext: context,
            callerContextHasInternalTime: Object.hasOwn(context, '__startTime'),
            data: response.data,
            requestContextHasInternalTime: hasInternalStartTime(requestLog?.data.context),
            requestContextId: requestLog?.data.context.correlationId,
            responseContextId: responseLog?.data.context.correlationId,
            responseData: responseLog?.data.data,
            responseDuration: responseLog?.data.stats?.duration,
            responseStartTime: responseLog?.data.stats?.startTime,
          }).toEqual({
            callerContext: { correlationId: 'request-123' },
            callerContextHasInternalTime: false,
            data: PRD_136_7317.body,
            requestContextHasInternalTime: false,
            requestContextId: 'request-123',
            responseContextId: 'request-123',
            responseData: PRD_136_7317.body,
            responseDuration: 12,
            responseStartTime: 0,
          });
        });
      });

      describe('Given response parsing fails', () => {
        it('When response parsing fails, then the failure log includes the error and caller context', async () => {
          // Arrange
          const context = { correlationId: 'missing-789' };
          const logs: { data: LogData; message: string }[] = [];

          const loggedClient = createRestClient({
            basePath,
            bodyParser: () => {
              throw new Error('Unable to parse response');
            },
            log: (message, data) => logs.push({ data, message }),
            performance,
          });

          mockedFetch.mockGetOnce(buildTestEndpoint('/unparseable'), { body: {}, headers: defaultHeaders });

          // Act
          const errorMessage = await getRejectedMessage(loggedClient.get('/unparseable', {}, context));
          const failureLog = logs.find(entry => entry.message === consts.FETCH_REQUEST_FAILED);

          // Assert
          expect({
            callerContext: context,
            errorMessage,
            failureLogError: failureLog?.data.error?.message,
            failureLogName: failureLog?.data.context.logEntryName,
            loggedContextId: failureLog?.data.context.correlationId,
          }).toEqual({
            callerContext: { correlationId: 'missing-789' },
            errorMessage: 'Unable to parse response',
            failureLogError: 'Unable to parse response',
            failureLogName: consts.FETCH_REQUEST_FAILED,
            loggedContextId: 'missing-789',
          });
        });
      });

      describe('Given a GET response redirects', () => {
        it('When GET follows a redirect, then the final response log retains caller context', async () => {
          // Arrange
          const context = { correlationId: 'redirect-456' };
          const logs: { data: LogData; message: string }[] = [];

          const loggedClient = createRestClient({
            basePath,
            log: (message, data) => logs.push({ data, message }),
            performance,
          });

          const initialUrl = buildTestEndpoint('/redirect');
          const redirectedUrl = `${basePath}/redirected`;

          mockedFetch.mockGetOnce(initialUrl, {
            headers: { [consts.LOCATION_HEADER]: redirectedUrl },
            status: 301,
          });

          mockedFetch.mockGetOnce(redirectedUrl, { body: { redirected: true }, headers: defaultHeaders });

          // Act
          const response = await loggedClient.get('/redirect', {}, context);
          const responseLog = logs.find(entry => entry.message === consts.FETCH_RESPONSE_RECEIVED);

          // Assert
          expect({
            callerContext: context,
            data: response.data,
            responseContextId: responseLog?.data.context.correlationId,
          }).toEqual({
            callerContext: { correlationId: 'redirect-456' },
            data: { redirected: true },
            responseContextId: 'redirect-456',
          });
        });
      });

      describe('Given the request exceeds its timeout', () => {
        beforeEach(() => {
          mockedFetch.mockGet(buildTestEndpoint(defaultPath), { body: PRD_136_7317.body }, { delay: 200 });
          // @ts-expect-error property is private
          restClient._fetchTimeout = 100;
        });

        it('When GET exceeds its timeout, then it rejects with a timeout error', async () => {
          // Act
          const errorMessage = await getRejectedMessage(
            restClient.getProduct({ pathTemplateData: idPathTemplateData }),
          );

          // Assert
          expect({
            fetchCount: mockedFetch.mock.calls.length,
            message: errorMessage,
          }).toEqual({
            fetchCount: 1,
            message: 'The request timed out. Getta did not get a response within 100ms.',
          });
        });
      });
    });
  });

  describe('Given a client configured with a POST shortcut', () => {
    let restClient: Getta & ShortcutProperties<'postProduct'>;

    beforeEach(() => {
      restClient = createRestClient<'postProduct'>(
        { basePath, cache: getCache(), performance },
        {
          postProduct: [
            graphqlPath,
            {
              method: consts.POST_METHOD,
            },
          ],
        },
      );
    });

    afterEach(() => {
      restClient.cache?.clear();
    });

    describe('Given a successful POST response', () => {
      beforeEach(() => {
        mockedFetch.mockPostOnce(
          { body: { mock: true }, url: buildTestEndpoint(graphqlPath) },
          { body: PRD_136_7317.body, headers: defaultHeaders },
        );
      });

      it('When POST is called, then it sends one request', async () => {
        // Act
        await restClient.post(graphqlPath, {
          body: JSON.stringify({ ...defaultPayload, mock: true }),
        });

        // Assert
        expect(mockedFetch).toHaveBeenCalledTimes(1);
      });

      it('When POST receives a response, then it returns the parsed data', async () => {
        // Act
        const { data } = await restClient.post(graphqlPath, {
          body: JSON.stringify({ ...defaultPayload, mock: true }),
        });

        // Assert
        expect(data).toEqual(PRD_136_7317.body);
      });
    });

    describe('Given a successful POST response through a shortcut', () => {
      beforeEach(() => {
        mockedFetch.mockPostOnce(
          { body: { mock: true }, url: buildTestEndpoint(graphqlPath) },
          { body: PRD_136_7317.body, headers: defaultHeaders },
        );
      });

      it('When the POST shortcut is called, then it sends one request', async () => {
        // Act
        await restClient.postProduct({ body: JSON.stringify({ ...defaultPayload, mock: true }) });

        // Assert
        expect(mockedFetch).toHaveBeenCalledTimes(1);
      });

      it('When the POST shortcut receives a response, then it returns parsed data', async () => {
        // Act
        const { data } = await restClient.postProduct({ body: JSON.stringify({ ...defaultPayload, mock: true }) });

        // Assert
        expect(data).toEqual(PRD_136_7317.body);
      });
    });
  });

  describe('Given a client configured with a DELETE shortcut', () => {
    let restClient: Getta & ShortcutProperties<'deleteProduct'>;

    beforeEach(() => {
      restClient = createRestClient<'deleteProduct'>(
        { basePath, cache: getCache(), performance },
        {
          deleteProduct: [
            defaultPath,
            {
              method: consts.DELETE_METHOD,
              pathTemplateData: pathTemplateDataWithoutID,
            },
          ],
        },
      );
    });

    afterEach(() => {
      restClient.cache?.clear();
    });

    describe('Given a resource is cached and DELETE succeeds', () => {
      beforeEach(async () => {
        const url = buildTestEndpoint(defaultPath);

        mockedFetch.mockGetOnce(url, {
          body: PRD_136_7317.body,
          headers: defaultHeaders,
        });

        mockedFetch.mockDeleteOnce(url);
        await restClient.get(defaultPath, { pathTemplateData: defaultPathTemplateData });
        mockedFetch.mockClear();
      });

      it('When DELETE is called, then it sends one request', async () => {
        // Act
        await restClient.delete(defaultPath, { pathTemplateData: defaultPathTemplateData });

        // Assert
        expect(mockedFetch).toHaveBeenCalledTimes(1);
      });

      it('When DELETE receives a response, then it returns the response status', async () => {
        // Act
        const { status } = await restClient.delete(defaultPath, { pathTemplateData: defaultPathTemplateData });

        // Assert
        expect(status).toBe(200);
      });

      it('When DELETE succeeds, then it removes the matching cache entry', async () => {
        // Arrange
        const cacheKey = generateCacheKey(buildTestEndpoint(defaultPath), { 'content-type': 'application/json' });
        const wasCachedBeforeDelete = restClient.cache?.has(cacheKey);

        // Act
        await restClient.delete(defaultPath, { pathTemplateData: defaultPathTemplateData });

        // Assert
        expect([wasCachedBeforeDelete, restClient.cache?.has(cacheKey)]).toEqual([true, false]);
      });
    });

    describe('Given a resource is cached and DELETE through a shortcut succeeds', () => {
      beforeEach(async () => {
        const url = buildTestEndpoint(defaultPath);

        mockedFetch.mockGetOnce(url, {
          body: PRD_136_7317.body,
          headers: defaultHeaders,
        });

        mockedFetch.mockDeleteOnce(url);
        await restClient.get(defaultPath, { pathTemplateData: defaultPathTemplateData });
        mockedFetch.mockClear();
      });

      it('When the DELETE shortcut is called, then it sends one request', async () => {
        // Act
        await restClient.deleteProduct({ pathTemplateData: idPathTemplateData });

        // Assert
        expect(mockedFetch).toHaveBeenCalledTimes(1);
      });

      it('When the DELETE shortcut receives a response, then it returns the response status', async () => {
        // Act
        const { status } = await restClient.deleteProduct({ pathTemplateData: idPathTemplateData });

        // Assert
        expect(status).toBe(200);
      });

      it('When the DELETE shortcut succeeds, then it removes the matching cache entry', async () => {
        // Arrange
        const cacheKey = generateCacheKey(buildTestEndpoint(defaultPath), { 'content-type': 'application/json' });
        const wasCachedBeforeDelete = restClient.cache?.has(cacheKey);

        // Act
        await restClient.deleteProduct({ pathTemplateData: idPathTemplateData });

        // Assert
        expect([wasCachedBeforeDelete, restClient.cache?.has(cacheKey)]).toEqual([true, false]);
      });
    });
  });

  describe('Given a client configured with a PUT shortcut', () => {
    let restClient: Getta & ShortcutProperties<'putProduct'>;

    beforeEach(() => {
      restClient = createRestClient<'putProduct'>(
        { basePath, cache: getCache(), performance },
        {
          putProduct: [
            defaultPath,
            {
              method: consts.PUT_METHOD,
              pathTemplateData: pathTemplateDataWithoutID,
            },
          ],
        },
      );
    });

    afterEach(() => {
      restClient.cache?.clear();
    });

    describe('Given the server returns a successful PUT response', () => {
      beforeEach(() => {
        mockedFetch.mockPutOnce({ body: { mock: true }, url: buildTestEndpoint(defaultPath) }, { status: 201 });
      });

      it('When PUT is called, then it sends one request', async () => {
        // Act
        await restClient.put(defaultPath, {
          body: JSON.stringify({ ...defaultPayload, mock: true }),
          pathTemplateData: defaultPathTemplateData,
        });

        // Assert
        expect(mockedFetch).toHaveBeenCalledTimes(1);
      });

      it('When PUT receives a response, then it returns the response status', async () => {
        // Act
        const { status } = await restClient.put(defaultPath, {
          body: JSON.stringify({ ...defaultPayload, mock: true }),
          pathTemplateData: defaultPathTemplateData,
        });

        // Assert
        expect(status).toBe(201);
      });
    });

    describe('Given the server returns a successful PUT response through a shortcut', () => {
      beforeEach(() => {
        mockedFetch.mockPutOnce({ body: { mock: true }, url: buildTestEndpoint(defaultPath) }, { status: 201 });
      });

      it('When the PUT shortcut is called, then it sends one request', async () => {
        // Act
        await restClient.putProduct({
          body: JSON.stringify({ ...defaultPayload, mock: true }),
          pathTemplateData: idPathTemplateData,
        });

        // Assert
        expect(mockedFetch).toHaveBeenCalledTimes(1);
      });

      it('When the PUT shortcut receives a response, then it returns the response status', async () => {
        // Act
        const { status } = await restClient.putProduct({
          body: JSON.stringify({ ...defaultPayload, mock: true }),
          pathTemplateData: idPathTemplateData,
        });

        // Assert
        expect(status).toBe(201);
      });
    });
  });

  describe('Given a rate-limited client', () => {
    let restClient: Getta;

    beforeEach(() => {
      restClient = createRestClient({ basePath, performance, rateLimit: true, rateLimitPerSecond: 1 });
    });

    afterEach(() => {
      restClient.cache?.clear();
      // @ts-expect-error property is private
      clearTimeout(restClient._rateLimitTimer);
    });

    describe('When requests exceed the configured per-second limit', () => {
      it('When the rate-limit window resets, then it sends queued requests', async () => {
        // Arrange
        mockedFetch.mockGetOnce(buildTestEndpoint('/first'));
        mockedFetch.mockGetOnce(buildTestEndpoint('/second'));

        // Act
        const firstRequest = restClient.get('/first');
        const queuedRequest = restClient.get('/second');
        await firstRequest;

        // Arrange the initial call count before the window resets
        const initialFetchCount = mockedFetch.mock.calls.length;

        // Act after the rate-limit window resets
        await queuedRequest;

        // Assert
        expect([initialFetchCount, mockedFetch.mock.calls.length]).toEqual([1, 2]);
      });
    });
  });
});
