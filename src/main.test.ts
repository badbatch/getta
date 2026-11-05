import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
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

const getRejectedMessage = async (promise: Promise<unknown>): Promise<string> => {
  try {
    await promise;
    return '';
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};

const hasInternalStartTime = (context: object | undefined) => (context ? Object.hasOwn(context, '__startTime') : false);

describe('Getta', () => {
  afterEach(() => {
    mockedFetch.mockReset();
  });

  describe('Given valid constructor options', () => {
    it('When createRestClient receives valid options, then it returns a Getta instance', () => {
      // Act
      const restClient = createRestClient({ basePath, cache: getCache(), performance });

      // Assert
      expect(restClient).toBeInstanceOf(Getta);
    });
  });

  describe('Given a client making an HTTP method request', () => {
    it('When request is called with PATCH, then it sends a PATCH request', async () => {
      // Arrange
      mockedFetch.mockRequestOnce(buildTestEndpoint('/patch'), {
        body: PRD_136_7317.body,
        headers: defaultHeaders,
      });

      const restClient = createRestClient({ basePath, performance });

      // Act
      await restClient.request('/patch', { body: JSON.stringify(defaultPayload), method: 'patch' });

      // Assert
      expect(mockedFetch.mock.calls[0]?.[1]).toMatchObject({ method: 'patch' });
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
          expect(response.headers.get('cache-control')?.includes('max-age=6000')).toBe(true);
          expect(response.headers.get('content-type')).toBe('application/json');
          expect(response.data).toEqual(PRD_136_7317.body);
          expect(response.ok).toBe(true);
          expect(response.status).toBe(200);
          expect(response.statusText).toBe('OK');
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
        expect(responseA.data.owner).toBe('A');
        expect(responseB.data.owner).toBe('B');
        expect(cachedResponseA.data.owner).toBe('A');
        expect(mockedFetch).toHaveBeenCalledTimes(2);
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
        expect(responseA.data.owner).toBe('A');
        expect(responseB.data.owner).toBe('B');
        expect(mockedFetch).toHaveBeenCalledTimes(2);
      });

      it('When GET returns cached data, then the cache-hit log includes it', async () => {
        // Arrange
        const cache = getCache();
        const logs: { data: LogData; message: string }[] = [];

        const loggedClient = createRestClient({
          basePath,
          cache,
          log: (message, data) => {
            logs.push({ data, message });
          },
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
        expect(cacheLog?.data.data).toEqual(expectedData);
        expect(cacheLog?.data.context.logEntryName).toBe(consts.FETCH_RESPONSE_FROM_CACHE);
        expect(mockedFetch).not.toHaveBeenCalled();
        expect(response.data).toEqual(expectedData);
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
            expect(cachedResponse.headers.get('content-type')).toBe('application/json');
            expect(cachedResponse.ok).toBe(true);
            expect(cachedResponse.status).toBe(200);
            expect(mockedFetch).toHaveBeenCalledTimes(1);
            expect(revalidatedResponse.data).toEqual(PRD_136_7317.body);
            expect(revalidatedResponse.status).toBe(304);
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
            let wasRejected = false;

            try {
              await restClient.getProduct({ pathTemplateData: idPathTemplateData });
            } catch {
              wasRejected = true;
            }

            // Assert
            expect(restClient.cache?.has(cacheKey)).toBe(false);
            expect(mockedFetch).toHaveBeenCalledTimes(1);
            expect(wasRejected).toBe(true);
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

          expect(mockedFetch).toHaveBeenCalledTimes(5);
          expect(errorMessage).toBe('The request exceeded the maximum number of redirects, which is 5.');
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

          expect(mockedFetch).toHaveBeenCalledTimes(3);
          expect(errorMessage).toBe('The request exceeded the maximum number of retries, which is 3.');
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
          expect(dataA).toEqual(PRD_136_7317.body);
          expect(dataB).toEqual(PRD_136_7317.body);
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
          expect(mockedFetch).toHaveBeenCalledTimes(1);
          expect(results).toHaveLength(2);
          expect(results[0].status).toBe('rejected');
          expect(results[1].status).toBe('rejected');
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
            log: (message, data) => {
              logs.push({ data, message });
            },
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
          expect(context).toEqual({ correlationId: 'request-123' });
          expect(Object.hasOwn(context, '__startTime')).toBe(false);
          expect(response.data).toEqual(PRD_136_7317.body);
          expect(hasInternalStartTime(requestLog?.data.context)).toBe(false);
          expect(requestLog?.data.context.correlationId).toBe('request-123');
          expect(responseLog?.data.context.correlationId).toBe('request-123');
          expect(responseLog?.data.data).toEqual(PRD_136_7317.body);
          expect(responseLog?.data.stats?.duration).toBe(12);
          expect(responseLog?.data.stats?.startTime).toBe(0);
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
            log: (message, data) => {
              logs.push({ data, message });
            },
            performance,
          });

          mockedFetch.mockGetOnce(buildTestEndpoint('/unparseable'), { body: {}, headers: defaultHeaders });

          // Act
          const errorMessage = await getRejectedMessage(loggedClient.get('/unparseable', {}, context));
          const failureLog = logs.find(entry => entry.message === consts.FETCH_REQUEST_FAILED);

          // Assert
          expect(context).toEqual({ correlationId: 'missing-789' });
          expect(errorMessage).toBe('Unable to parse response');
          expect(failureLog?.data.error?.message).toBe('Unable to parse response');
          expect(failureLog?.data.context.logEntryName).toBe(consts.FETCH_REQUEST_FAILED);
          expect(failureLog?.data.context.correlationId).toBe('missing-789');
        });
      });

      describe('Given a GET response redirects', () => {
        it('When GET follows a redirect, then the final response log retains caller context', async () => {
          // Arrange
          const context = { correlationId: 'redirect-456' };
          const logs: { data: LogData; message: string }[] = [];

          const loggedClient = createRestClient({
            basePath,
            log: (message, data) => {
              logs.push({ data, message });
            },
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
          expect(context).toEqual({ correlationId: 'redirect-456' });
          expect(response.data).toEqual({ redirected: true });
          expect(responseLog?.data.context.correlationId).toBe('redirect-456');
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
          expect(mockedFetch).toHaveBeenCalledTimes(1);
          expect(errorMessage).toBe('The request timed out. Getta did not get a response within 100ms.');
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
        expect(wasCachedBeforeDelete).toBe(true);
        expect(restClient.cache?.has(cacheKey)).toBe(false);
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
        expect(wasCachedBeforeDelete).toBe(true);
        expect(restClient.cache?.has(cacheKey)).toBe(false);
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
        expect(initialFetchCount).toBe(1);
        expect(mockedFetch).toHaveBeenCalledTimes(2);
      });
    });
  });
});
