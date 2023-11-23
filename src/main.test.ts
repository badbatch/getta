import { jest } from '@jest/globals';
import { mockFetch, polyfillFetch } from 'fetch-mocked';
import { performance } from 'node:perf_hooks';
import { Md5 } from 'ts-md5';
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
import { type FetchResponse, type ResponseDataWithErrors, type ShortcutProperties } from './types.ts';

polyfillFetch();
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
    let response: ResponseDataWithErrors | ResponseDataWithErrors[];

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
        }
      );
    });

    afterEach(async () => {
      await restClient.cache?.clear();
    });

    describe('when a resource is requested', () => {
      beforeEach(async () => {
        mockedFetch.mockGetOnce(buildTestEndpoint(defaultPath), {
          body: PRD_136_7317.body,
          headers: defaultHeaders,
        });

        response = await restClient.get(defaultPath, { pathTemplateData: defaultPathTemplateData });
      });

      it('should have made one request', () => {
        expect(mockedFetch).toHaveBeenCalledTimes(1);
      });

      it('should return the correct response', () => {
        expect(response).toEqual(
          expect.objectContaining({
            data: PRD_136_7317.body,
          })
        );
      });
    });

    describe('when a resource is requested with a shortcut', () => {
      beforeEach(async () => {
        mockedFetch.mockGetOnce(buildTestEndpoint(defaultPath), {
          body: PRD_136_7317.body,
          headers: defaultHeaders,
        });

        response = await restClient.getProduct({ pathTemplateData: idPathTemplateData });
      });

      it('should have made one request', () => {
        expect(mockedFetch).toHaveBeenCalledTimes(1);
      });

      it('should return the correct response', () => {
        expect(response).toEqual(
          expect.objectContaining({
            data: PRD_136_7317.body,
          })
        );
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
          response = await restClient.getProduct({ pathTemplateData: idPathTemplateData });
        });

        it('should not have made a request', () => {
          expect(mockedFetch).not.toHaveBeenCalled();
        });

        it('should return the correct response', () => {
          expect(response).toEqual(
            expect.objectContaining({
              data: PRD_136_7317.body,
            })
          );
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
          beforeEach(async () => {
            mockedFetch.mockGetOnce(
              { headers: { [consts.IF_NONE_MATCH_HEADER]: defaultEtag }, url: buildTestEndpoint(defaultPath) },
              { headers: defaultHeaders, status: 304 }
            );

            response = await restClient.getProduct({ pathTemplateData: idPathTemplateData });
          });

          it('should have made one request', () => {
            expect(mockedFetch).toHaveBeenCalledTimes(1);
          });

          it('should return the correct response', () => {
            expect(response).toEqual(
              expect.objectContaining({
                data: PRD_136_7317.body,
              })
            );
          });
        });

        describe('when the response returns the resource', () => {
          beforeEach(async () => {
            mockedFetch.mockGetOnce(
              { headers: { [consts.IF_NONE_MATCH_HEADER]: defaultEtag }, url: buildTestEndpoint(defaultPath) },
              { body: PRD_136_7317.body, headers: defaultHeaders }
            );

            response = await restClient.getProduct({ pathTemplateData: idPathTemplateData });
          });

          it('should have made one request', () => {
            expect(mockedFetch).toHaveBeenCalledTimes(1);
          });

          it('should return the correct response', () => {
            expect(response).toEqual(
              expect.objectContaining({
                data: PRD_136_7317.body,
              })
            );
          });
        });

        describe('when the response returns a 404', () => {
          beforeEach(async () => {
            mockedFetch.mockGetOnce(
              { headers: { [consts.IF_NONE_MATCH_HEADER]: defaultEtag }, url: buildTestEndpoint(defaultPath) },
              { status: 404 }
            );

            response = await restClient.getProduct({ pathTemplateData: idPathTemplateData });
          });

          it('should have made one request', () => {
            expect(mockedFetch).toHaveBeenCalledTimes(1);
          });

          it('should return the correct response', () => {
            expect(response).toEqual(
              expect.objectContaining({
                errors: [new Error(consts.RESOURCE_NOT_FOUND_ERROR)],
              })
            );
          });
        });
      });
    });

    describe('when a request is redirected more than five times', () => {
      const REDIRECT_COOKIE_FLAG = 'status=redirect';

      beforeEach(async () => {
        mockedFetch.mockGet(
          { headers: { [consts.COOKIE_HEADER]: REDIRECT_COOKIE_FLAG }, url: '*' },
          { headers: { ...defaultHeaders, [consts.LOCATION_HEADER]: basePath }, status: 301 }
        );

        response = await restClient.getProduct({
          headers: { [consts.COOKIE_HEADER]: REDIRECT_COOKIE_FLAG },
          pathTemplateData: idPathTemplateData,
        });
      });

      it('should have made five requests', () => {
        expect(mockedFetch).toHaveBeenCalledTimes(5);
      });

      it('should return the correct response', () => {
        expect(response).toEqual(
          expect.objectContaining({
            errors: [new Error(`${consts.MAX_REDIRECTS_EXCEEDED_ERROR} 5.`)],
          })
        );
      });
    });

    describe('when a request is retried more than three times', () => {
      const RETRY_COOKIE_FLAG = 'status=retry';

      beforeEach(async () => {
        mockedFetch.mockGet(
          { headers: { [consts.COOKIE_HEADER]: RETRY_COOKIE_FLAG }, url: buildTestEndpoint(defaultPath) },
          { body: PRD_136_7317.body, status: 500 }
        );

        response = await restClient.getProduct({
          headers: { [consts.COOKIE_HEADER]: RETRY_COOKIE_FLAG },
          pathTemplateData: idPathTemplateData,
        });
      });

      it('should have made three requests', () => {
        expect(mockedFetch).toHaveBeenCalledTimes(3);
      });

      it('should return the correct response', () => {
        expect(response).toEqual(
          expect.objectContaining({
            errors: [new Error(`${consts.MAX_RETRIES_EXCEEDED_ERROR} 3.`)],
          })
        );
      });
    });

    describe('when the same resource is requested in quick succession', () => {
      beforeEach(async () => {
        mockedFetch.mockGet(buildTestEndpoint(defaultPath), { body: PRD_136_7317.body, headers: defaultHeaders });

        response = await Promise.all([
          restClient.get(defaultPath, { pathTemplateData: defaultPathTemplateData }),
          restClient.get(defaultPath, { pathTemplateData: defaultPathTemplateData }),
        ]);
      });

      it('should have made one request', () => {
        expect(mockedFetch).toHaveBeenCalledTimes(1);
      });

      it('should return the correct response', () => {
        expect(response as ResponseDataWithErrors[]).toEqual([
          expect.objectContaining({
            data: PRD_136_7317.body,
          }),
          expect.objectContaining({
            data: PRD_136_7317.body,
          }),
        ]);
      });
    });

    describe('when a request times out', () => {
      beforeEach(async () => {
        mockedFetch.mockGet(buildTestEndpoint(defaultPath), { body: PRD_136_7317.body }, { delay: 200 });
        // @ts-expect-error property is private
        restClient._fetchTimeout = 100;

        response = await restClient.getProduct({
          pathTemplateData: idPathTemplateData,
        });
      });

      it('should have made one request', () => {
        expect(mockedFetch).toHaveBeenCalledTimes(1);
      });

      it('should return the correct response', () => {
        expect(response).toEqual(
          expect.objectContaining({
            errors: [new Error(`${consts.FETCH_TIMEOUT_ERROR} 100ms.`)],
          })
        );
      });
    });
  });

  describe('post method', () => {
    let restClient: Getta & ShortcutProperties<'postProduct'>;
    let response: FetchResponse;

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
        }
      );
    });

    afterEach(async () => {
      await restClient.cache?.clear();
    });

    describe('when a resource is requested', () => {
      beforeEach(async () => {
        mockedFetch.mockPostOnce(
          { body: { mock: true }, url: buildTestEndpoint(graphqlPath) },
          { body: PRD_136_7317.body, headers: defaultHeaders }
        );

        response = await restClient.post(graphqlPath, {
          body: JSON.stringify({ ...defaultPayload, mock: true }),
        });
      });

      it('should have made one request', () => {
        expect(mockedFetch).toHaveBeenCalledTimes(1);
      });

      it('should return the correct response', () => {
        expect(response).toEqual(
          expect.objectContaining({
            data: PRD_136_7317.body,
          })
        );
      });
    });

    describe('when a resource is requested with a shortcut', () => {
      beforeEach(async () => {
        mockedFetch.mockPostOnce(
          { body: { mock: true }, url: buildTestEndpoint(graphqlPath) },
          { body: PRD_136_7317.body, headers: defaultHeaders }
        );

        response = await restClient.postProduct({ body: JSON.stringify({ ...defaultPayload, mock: true }) });
      });

      it('should have made one request', () => {
        expect(mockedFetch).toHaveBeenCalledTimes(1);
      });

      it('should return the correct response', () => {
        expect(response).toEqual(
          expect.objectContaining({
            data: PRD_136_7317.body,
          })
        );
      });
    });
  });

  describe('delete method', () => {
    let restClient: Getta & ShortcutProperties<'deleteProduct'>;
    let response: FetchResponse;

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
        }
      );
    });

    afterEach(async () => {
      await restClient.cache?.clear();
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
        response = await restClient.delete(defaultPath, { pathTemplateData: defaultPathTemplateData });
      });

      it('should have made one request', () => {
        expect(mockedFetch).toHaveBeenCalledTimes(1);
      });

      it('should return the correct response', () => {
        expect(response.status).toBe(200);
      });

      it('should delete any matching cache entry', async () => {
        await expect(restClient.cache?.has(Md5.hashStr(buildTestEndpoint(defaultPath)))).resolves.toBe(false);
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
        response = await restClient.deleteProduct({ pathTemplateData: idPathTemplateData });
      });

      it('should have made one request', () => {
        expect(mockedFetch).toHaveBeenCalledTimes(1);
      });

      it('should return the correct response', () => {
        expect(response.status).toBe(200);
      });

      it('should delete any matching cache entry', async () => {
        await expect(restClient.cache?.has(Md5.hashStr(buildTestEndpoint(defaultPath)))).resolves.toBe(false);
      });
    });
  });

  describe('put method', () => {
    let restClient: Getta & ShortcutProperties<'putProduct'>;
    let response: FetchResponse;

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
        }
      );
    });

    afterEach(async () => {
      await restClient.cache?.clear();
    });

    describe('when a resource is send', () => {
      beforeEach(async () => {
        mockedFetch.mockPutOnce({ body: { mock: true }, url: buildTestEndpoint(defaultPath) }, { status: 201 });

        response = await restClient.put(defaultPath, {
          body: JSON.stringify({ ...defaultPayload, mock: true }),
          pathTemplateData: defaultPathTemplateData,
        });
      });

      it('should have made one request', () => {
        expect(mockedFetch).toHaveBeenCalledTimes(1);
      });

      it('should return the correct response', () => {
        expect(response.status).toBe(201);
      });
    });

    describe('when a resource is sent with a shortcut', () => {
      beforeEach(async () => {
        mockedFetch.mockPutOnce({ body: { mock: true }, url: buildTestEndpoint(defaultPath) }, { status: 201 });

        response = await restClient.putProduct({
          body: JSON.stringify({ ...defaultPayload, mock: true }),
          pathTemplateData: idPathTemplateData,
        });
      });

      it('should have made one request', () => {
        expect(mockedFetch).toHaveBeenCalledTimes(1);
      });

      it('should return the correct response', () => {
        expect(response.status).toBe(201);
      });
    });
  });

  describe('rate limiting', () => {
    let restClient: Getta;

    beforeEach(() => {
      restClient = createRestClient({ basePath, performance, rateLimit: true });
    });

    afterEach(async () => {
      await restClient.cache?.clear();
      // @ts-expect-error property is private
      clearTimeout(restClient._rateLimitTimer);
    });

    describe('when the number of requests per second exceeds rateLimitPerSecond', () => {
      beforeEach(async () => {
        const requestKeys = [...Array.from({ length: 55 }).keys()];

        for (const key of requestKeys) {
          mockedFetch.mockGetOnce(buildTestEndpoint(`product/${key}`));
        }

        // @ts-expect-error property is private
        restClient._addRequestToRateLimitedQueue = jest.fn().mockResolvedValue({ status: 200 });
        await Promise.all(requestKeys.map(key => restClient.get(`product/${key}`, { headers: defaultHeaders })));
      });

      it('should call fetch one less than the rate limit', () => {
        expect(mockedFetch).toHaveBeenCalledTimes(49);
      });

      it('should add the excess requests to rateLimitedRequestQueue', () => {
        // @ts-expect-error property is private
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(restClient._addRequestToRateLimitedQueue).toHaveBeenCalledTimes(6);
      });
    });
  });
});
