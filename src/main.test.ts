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
import { Getta, createRestClient } from './main.ts';
import { type ShortcutProperties } from './types.ts';

const mockedFetch = mockFetch(jest.fn);

describe('Getta', () => {
  afterEach(() => {
    mockedFetch.mockReset();
  });

  describe('constructor', () => {
    it('should return an instance of the Getta class', () => {
      const restClient = createRestClient({ basePath, cache: getCache(), performance });
      expect(restClient).toBeInstanceOf(Getta);
    });
  });

  describe('get method', () => {
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

    describe('when a resource is requested', () => {
      beforeEach(() => {
        mockedFetch.mockGetOnce(buildTestEndpoint(defaultPath), {
          body: PRD_136_7317.body,
          headers: defaultHeaders,
        });
      });

      it('should have made one request', async () => {
        await restClient.get(defaultPath, { pathTemplateData: defaultPathTemplateData });
        expect(mockedFetch).toHaveBeenCalledTimes(1);
      });

      it('should return the correct response', async () => {
        const { data } = await restClient.get(defaultPath, { pathTemplateData: defaultPathTemplateData });
        expect(data).toEqual(PRD_136_7317.body);
      });
    });

    describe('when a resource is requested with a shortcut', () => {
      beforeEach(() => {
        mockedFetch.mockGetOnce(buildTestEndpoint(defaultPath), {
          body: PRD_136_7317.body,
          headers: defaultHeaders,
        });
      });

      it('should have made one request', async () => {
        await restClient.getProduct({ pathTemplateData: idPathTemplateData });
        expect(mockedFetch).toHaveBeenCalledTimes(1);
      });

      it('should return the correct response', async () => {
        const { data } = await restClient.getProduct({ pathTemplateData: idPathTemplateData });
        expect(data).toEqual(PRD_136_7317.body);
      });
    });

    describe('when a resource is in the cache', () => {
      describe('when the cache entry is valid', () => {
        beforeEach(async () => {
          mockedFetch.mockGetOnce(buildTestEndpoint(defaultPath), {
            body: PRD_136_7317.body,
            headers: defaultHeaders,
          });

          await restClient.getProduct({ pathTemplateData: idPathTemplateData });
          mockedFetch.mockClear();
        });

        it('should not have made a request', async () => {
          await restClient.getProduct({ pathTemplateData: idPathTemplateData });
          expect(mockedFetch).not.toHaveBeenCalled();
        });

        it('should return the correct response', async () => {
          const { data } = await restClient.getProduct({ pathTemplateData: idPathTemplateData });
          expect(data).toEqual(PRD_136_7317.body);
        });
      });

      describe('when the cache entry is invalid', () => {
        beforeEach(async () => {
          mockedFetch.mockGetOnce(buildTestEndpoint(defaultPath), {
            body: PRD_136_7317.body,
            headers: { ...defaultHeaders, 'cache-control': 'public, max-age=1' },
          });

          await restClient.getProduct({ pathTemplateData: idPathTemplateData });
          await delay(1000);
          mockedFetch.mockClear();
        });

        describe('when the response returns not modified status code', () => {
          beforeEach(() => {
            const url = buildTestEndpoint(defaultPath);

            mockedFetch.mockGetOnce(
              { headers: { [consts.IF_NONE_MATCH_HEADER]: defaultEtag }, url },
              { headers: defaultHeaders, status: 304 },
            );
          });

          it('should have made one request', async () => {
            await restClient.getProduct({ pathTemplateData: idPathTemplateData });
            expect(mockedFetch).toHaveBeenCalledTimes(1);
          });

          it('should return the correct response', async () => {
            const { data } = await restClient.getProduct({ pathTemplateData: idPathTemplateData });
            expect(data).toEqual(PRD_136_7317.body);
          });
        });

        describe('when the response returns the resource', () => {
          beforeEach(() => {
            const url = buildTestEndpoint(defaultPath);
            mockedFetch.mockGetOnce({ url }, { body: PRD_136_7317.body, headers: defaultHeaders });
          });

          it('should have made one request', async () => {
            await restClient.getProduct({ pathTemplateData: idPathTemplateData });
            expect(mockedFetch).toHaveBeenCalledTimes(1);
          });

          it('should return the correct response', async () => {
            const { data } = await restClient.getProduct({ pathTemplateData: idPathTemplateData });
            expect(data).toEqual(PRD_136_7317.body);
          });
        });

        describe('when the response returns a 404', () => {
          beforeEach(() => {
            mockedFetch.mockGetOnce({ url: buildTestEndpoint(defaultPath) }, { status: 404 });
          });

          it('should have made one request', async () => {
            try {
              await restClient.getProduct({ pathTemplateData: idPathTemplateData });
            } catch {
              // no catch
            }

            expect(mockedFetch).toHaveBeenCalledTimes(1);
          });

          it('should throw the expected error', async () => {
            await expect(restClient.getProduct({ pathTemplateData: idPathTemplateData })).rejects.toThrow(
              'The requested resource could not been found.',
            );
          });

          it('should delete the existing resource', async () => {
            try {
              await restClient.getProduct({ pathTemplateData: idPathTemplateData });
            } catch {
              // no catch
            }

            expect(restClient.cache?.metadata).toHaveLength(0);
          });
        });
      });

      describe('when a request is redirected more than five times', () => {
        const REDIRECT_COOKIE_FLAG = 'status=redirect';

        beforeEach(() => {
          mockedFetch.mockGet(
            { headers: { [consts.COOKIE_HEADER]: REDIRECT_COOKIE_FLAG }, url: '*' },
            { headers: { ...defaultHeaders, [consts.LOCATION_HEADER]: basePath }, status: 301 },
          );
        });

        it('should have made five requests', async () => {
          try {
            await restClient.getProduct({
              headers: { [consts.COOKIE_HEADER]: REDIRECT_COOKIE_FLAG },
              pathTemplateData: idPathTemplateData,
            });
          } catch {
            // no catch
          }

          expect(mockedFetch).toHaveBeenCalledTimes(5);
        });

        it('should throw the expected error', async () => {
          await expect(
            restClient.getProduct({
              headers: { [consts.COOKIE_HEADER]: REDIRECT_COOKIE_FLAG },
              pathTemplateData: idPathTemplateData,
            }),
          ).rejects.toThrow('The request exceeded the maximum number of redirects, which is 5');
        });
      });

      describe('when a request is retried more than three times', () => {
        const RETRY_COOKIE_FLAG = 'status=retry';

        beforeEach(() => {
          mockedFetch.mockGet(
            { headers: { [consts.COOKIE_HEADER]: RETRY_COOKIE_FLAG }, url: buildTestEndpoint(defaultPath) },
            { body: PRD_136_7317.body, status: 500 },
          );
        });

        it('should have made three requests', async () => {
          try {
            await restClient.getProduct({
              headers: { [consts.COOKIE_HEADER]: RETRY_COOKIE_FLAG },
              pathTemplateData: idPathTemplateData,
            });
          } catch {
            // no catch
          }

          expect(mockedFetch).toHaveBeenCalledTimes(3);
        });

        it('should return the correct response', async () => {
          await expect(
            restClient.getProduct({
              headers: { [consts.COOKIE_HEADER]: RETRY_COOKIE_FLAG },
              pathTemplateData: idPathTemplateData,
            }),
          ).rejects.toThrow('The request exceeded the maximum number of retries, which is 3.');
        });
      });

      describe('when the same resource is requested in quick succession', () => {
        beforeEach(() => {
          mockedFetch.mockGet(buildTestEndpoint(defaultPath), { body: PRD_136_7317.body, headers: defaultHeaders });
        });

        it('should have made one request', async () => {
          await Promise.all([
            restClient.get(defaultPath, { pathTemplateData: defaultPathTemplateData }),
            restClient.get(defaultPath, { pathTemplateData: defaultPathTemplateData }),
          ]);

          expect(mockedFetch).toHaveBeenCalledTimes(1);
        });

        it('should return the correct response', async () => {
          const [{ data: dataA }, { data: dataB }] = await Promise.all([
            restClient.get(defaultPath, { pathTemplateData: defaultPathTemplateData }),
            restClient.get(defaultPath, { pathTemplateData: defaultPathTemplateData }),
          ]);

          expect(dataA).toEqual(PRD_136_7317.body);
          // Assertions are so closely related, this is okay.
          // eslint-disable-next-line jest/max-expects
          expect(dataB).toEqual(PRD_136_7317.body);
        });
      });

      describe('when a request times out', () => {
        beforeEach(() => {
          mockedFetch.mockGet(buildTestEndpoint(defaultPath), { body: PRD_136_7317.body }, { delay: 200 });
          // @ts-expect-error property is private
          restClient._fetchTimeout = 100;
        });

        it('should have made one request', async () => {
          try {
            await restClient.getProduct({
              pathTemplateData: idPathTemplateData,
            });
          } catch {
            // no catch
          }

          expect(mockedFetch).toHaveBeenCalledTimes(1);
        });

        it('should throw the expected error', async () => {
          await expect(
            restClient.getProduct({
              pathTemplateData: idPathTemplateData,
            }),
          ).rejects.toThrow('The request timed out. Getta did not get a response within 100ms.');
        });
      });
    });
  });

  describe('post method', () => {
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

    describe('when a post is made', () => {
      beforeEach(() => {
        mockedFetch.mockPostOnce(
          { body: { mock: true }, url: buildTestEndpoint(graphqlPath) },
          { body: PRD_136_7317.body, headers: defaultHeaders },
        );
      });

      it('should have made one request', async () => {
        await restClient.post(graphqlPath, {
          body: JSON.stringify({ ...defaultPayload, mock: true }),
        });

        expect(mockedFetch).toHaveBeenCalledTimes(1);
      });

      it('should return the correct response', async () => {
        const { data } = await restClient.post(graphqlPath, {
          body: JSON.stringify({ ...defaultPayload, mock: true }),
        });

        expect(data).toEqual(PRD_136_7317.body);
      });
    });

    describe('when a post is made with a shortcut', () => {
      beforeEach(() => {
        mockedFetch.mockPostOnce(
          { body: { mock: true }, url: buildTestEndpoint(graphqlPath) },
          { body: PRD_136_7317.body, headers: defaultHeaders },
        );
      });

      it('should have made one request', async () => {
        await restClient.postProduct({ body: JSON.stringify({ ...defaultPayload, mock: true }) });
        expect(mockedFetch).toHaveBeenCalledTimes(1);
      });

      it('should return the correct response', async () => {
        const { data } = await restClient.postProduct({ body: JSON.stringify({ ...defaultPayload, mock: true }) });
        expect(data).toEqual(PRD_136_7317.body);
      });
    });
  });

  describe('delete method', () => {
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

    describe('when a resource is requested to be deleted', () => {
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

      it('should have made one request', async () => {
        await restClient.delete(defaultPath, { pathTemplateData: defaultPathTemplateData });
        expect(mockedFetch).toHaveBeenCalledTimes(1);
      });

      it('should return the correct response', async () => {
        const { status } = await restClient.delete(defaultPath, { pathTemplateData: defaultPathTemplateData });
        expect(status).toBe(200);
      });

      it('should delete any matching cache entry', async () => {
        await restClient.delete(defaultPath, { pathTemplateData: defaultPathTemplateData });
        expect(restClient.cache?.has(buildTestEndpoint(defaultPath))).toBe(false);
      });
    });

    describe('when a resource is requested to be deleted with a shortcut', () => {
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

      it('should have made one request', async () => {
        await restClient.deleteProduct({ pathTemplateData: idPathTemplateData });
        expect(mockedFetch).toHaveBeenCalledTimes(1);
      });

      it('should return the correct response', async () => {
        const { status } = await restClient.deleteProduct({ pathTemplateData: idPathTemplateData });
        expect(status).toBe(200);
      });

      it('should delete any matching cache entry', async () => {
        await restClient.deleteProduct({ pathTemplateData: idPathTemplateData });
        expect(restClient.cache?.has(buildTestEndpoint(defaultPath))).toBe(false);
      });
    });
  });

  describe('put method', () => {
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

    describe('when a resource is send', () => {
      beforeEach(() => {
        mockedFetch.mockPutOnce({ body: { mock: true }, url: buildTestEndpoint(defaultPath) }, { status: 201 });
      });

      it('should have made one request', async () => {
        await restClient.put(defaultPath, {
          body: JSON.stringify({ ...defaultPayload, mock: true }),
          pathTemplateData: defaultPathTemplateData,
        });

        expect(mockedFetch).toHaveBeenCalledTimes(1);
      });

      it('should return the correct response', async () => {
        const { status } = await restClient.put(defaultPath, {
          body: JSON.stringify({ ...defaultPayload, mock: true }),
          pathTemplateData: defaultPathTemplateData,
        });

        expect(status).toBe(201);
      });
    });

    describe('when a resource is sent with a shortcut', () => {
      beforeEach(() => {
        mockedFetch.mockPutOnce({ body: { mock: true }, url: buildTestEndpoint(defaultPath) }, { status: 201 });
      });

      it('should have made one request', async () => {
        await restClient.putProduct({
          body: JSON.stringify({ ...defaultPayload, mock: true }),
          pathTemplateData: idPathTemplateData,
        });

        expect(mockedFetch).toHaveBeenCalledTimes(1);
      });

      it('should return the correct response', async () => {
        const { status } = await restClient.putProduct({
          body: JSON.stringify({ ...defaultPayload, mock: true }),
          pathTemplateData: idPathTemplateData,
        });

        expect(status).toBe(201);
      });
    });
  });

  describe('rate limiting', () => {
    let restClient: Getta;

    beforeEach(() => {
      restClient = createRestClient({ basePath, performance, rateLimit: true });
    });

    afterEach(() => {
      restClient.cache?.clear();
      // @ts-expect-error property is private
      clearTimeout(restClient._rateLimitTimer);
    });

    describe('when the number of requests per second exceeds rateLimitPerSecond', () => {
      const requestKeys = [...Array.from({ length: 55 }).keys()];

      beforeEach(() => {
        for (const key of requestKeys) {
          mockedFetch.mockGetOnce(buildTestEndpoint(`product/${String(key)}`));
        }

        // @ts-expect-error property is private
        restClient._addRequestToRateLimitedQueue = jest.fn().mockResolvedValue({ status: 200 });
      });

      it('should call fetch up to the rate limit', async () => {
        await Promise.all(
          requestKeys.map(key => restClient.get(`product/${String(key)}`, { headers: defaultHeaders })),
        );

        expect(mockedFetch).toHaveBeenCalledTimes(50);
      });

      it('should add the excess requests to rateLimitedRequestQueue', async () => {
        await Promise.all(
          requestKeys.map(key => restClient.get(`product/${String(key)}`, { headers: defaultHeaders })),
        );

        // @ts-expect-error property is private
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(restClient._addRequestToRateLimitedQueue).toHaveBeenCalledTimes(5);
      });
    });
  });
});
