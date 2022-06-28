import { StringObject } from "@repodog/types";
import fetchMock, { MockRequest } from "fetch-mock";
import md5 from "md5";
import { PRD_136_7317 } from "./__tests__/data";
import {
  basePath,
  defaultEtag,
  defaultPath,
  defaultPathTemplateData,
  defaultPayload,
  getCache,
  idPathTemplateData,
  mockRequest,
  pathTemplateDataWithoutID,
  tearDownTest,
} from "./__tests__/helpers";
import {
  COOKIE_HEADER,
  DELETE_METHOD,
  GET_METHOD,
  IF_NONE_MATCH_HEADER,
  LOCATION_HEADER,
  MAX_REDIRECTS_EXCEEDED_ERROR,
  MAX_RETRIES_EXCEEDED_ERROR,
  POST_METHOD,
  PUT_METHOD,
  RESOURCE_NOT_FOUND_ERROR,
} from "./constants";
import delay from "./helpers/delay";
import createRestClient, { Getta } from "./main";
import { ResponseDataWithErrors, ShortcutProperties } from "./types";

describe("Getta", () => {
  describe("constructor", () => {
    it("SHOULD return an instance of the Getta class", () => {
      const restClient = createRestClient({ basePath, cache: getCache() });
      expect(restClient).toBeInstanceOf(Getta);
    });
  });

  describe("get method", () => {
    let restClient: Getta & ShortcutProperties<"getProduct">;
    let response: ResponseDataWithErrors | ResponseDataWithErrors[];

    beforeAll(() => {
      restClient = createRestClient<"getProduct">(
        { basePath, cache: getCache() },
        {
          getProduct: [
            defaultPath,
            {
              method: GET_METHOD,
              pathTemplateData: pathTemplateDataWithoutID,
            },
          ],
        },
      );
    });

    describe("WHEN a resource is requested", () => {
      beforeAll(async () => {
        mockRequest(
          defaultPath,
          PRD_136_7317.body,
          { pathTemplateData: defaultPathTemplateData },
          ({ endpoint, ...rest }) => {
            fetchMock.get(endpoint, rest);
          },
        );

        response = await restClient.get(defaultPath, { pathTemplateData: defaultPathTemplateData });
      });

      afterAll(async () => {
        await tearDownTest({ fetchMock, restClient });
      });

      it("SHOULD have made one request", () => {
        expect(fetchMock.calls().length).toBe(1);
      });

      it("SHOULD return the correct response", () => {
        expect(response).toEqual(
          expect.objectContaining({
            data: PRD_136_7317.body,
          }),
        );
      });
    });

    describe("WHEN a resource is requested with a shortcut", () => {
      beforeAll(async () => {
        mockRequest(
          defaultPath,
          PRD_136_7317.body,
          { pathTemplateData: defaultPathTemplateData },
          ({ endpoint, ...rest }) => {
            fetchMock.get(endpoint, rest);
          },
        );

        response = await restClient.getProduct({ pathTemplateData: idPathTemplateData });
      });

      afterAll(async () => {
        await tearDownTest({ fetchMock, restClient });
      });

      it("SHOULD have made one request", () => {
        expect(fetchMock.calls().length).toBe(1);
      });

      it("SHOULD return the correct response", () => {
        expect(response).toEqual(
          expect.objectContaining({
            data: PRD_136_7317.body,
          }),
        );
      });
    });

    describe("WHEN a resource is in the cache", () => {
      describe("WHEN the cache entry is valid", () => {
        beforeAll(async () => {
          mockRequest(
            defaultPath,
            PRD_136_7317.body,
            { pathTemplateData: defaultPathTemplateData },
            ({ endpoint, ...rest }) => {
              fetchMock.get(endpoint, rest);
            },
          );

          await restClient.getProduct({ pathTemplateData: idPathTemplateData });
          fetchMock.restore();
          response = await restClient.getProduct({ pathTemplateData: idPathTemplateData });
        });

        afterAll(async () => {
          await tearDownTest({ fetchMock, restClient });
        });

        it("SHOULD not have made a request", () => {
          expect(fetchMock.calls().length).toBe(0);
        });

        it("SHOULD return the correct response", () => {
          expect(response).toEqual(
            expect.objectContaining({
              data: PRD_136_7317.body,
            }),
          );
        });
      });

      describe("WHEN the cache entry is invalid", () => {
        function matcher(_url: string, { headers }: MockRequest) {
          return !!headers && (headers as StringObject)[IF_NONE_MATCH_HEADER] === defaultEtag;
        }

        async function invalidCacheEntryTestSetup() {
          mockRequest(
            defaultPath,
            PRD_136_7317.body,
            { headers: { "cache-control": "public, max-age=1" }, pathTemplateData: defaultPathTemplateData },
            ({ endpoint, ...rest }) => {
              fetchMock.get(endpoint, rest);
            },
          );

          await restClient.getProduct({ pathTemplateData: idPathTemplateData });
          await delay(1000);

          fetchMock.restore();
        }

        describe("WHEN the response returns not modified status code", () => {
          beforeAll(async () => {
            await invalidCacheEntryTestSetup();

            mockRequest(
              defaultPath,
              PRD_136_7317.body,
              { pathTemplateData: defaultPathTemplateData },
              ({ headers }) => {
                fetchMock.mock(matcher, { headers, status: 304 });
              },
            );

            response = await restClient.getProduct({ pathTemplateData: idPathTemplateData });
          });

          afterAll(async () => {
            await tearDownTest({ fetchMock, restClient });
          });

          it("SHOULD have made one request", () => {
            expect(fetchMock.calls().length).toBe(1);
          });

          it("SHOULD return the correct response", () => {
            expect(response).toEqual(
              expect.objectContaining({
                data: PRD_136_7317.body,
              }),
            );
          });
        });

        describe("WHEN the response returns the resource", () => {
          beforeAll(async () => {
            await invalidCacheEntryTestSetup();

            mockRequest(
              defaultPath,
              PRD_136_7317.body,
              { pathTemplateData: defaultPathTemplateData },
              ({ body, headers }) => {
                fetchMock.mock(matcher, { body, headers, status: 200 });
              },
            );

            response = await restClient.getProduct({ pathTemplateData: idPathTemplateData });
          });

          afterAll(async () => {
            await tearDownTest({ fetchMock, restClient });
          });

          it("SHOULD have made one request", () => {
            expect(fetchMock.calls().length).toBe(1);
          });

          it("SHOULD return the correct response", () => {
            expect(response).toEqual(
              expect.objectContaining({
                data: PRD_136_7317.body,
              }),
            );
          });
        });

        describe("WHEN the response returns a 404", () => {
          beforeAll(async () => {
            await invalidCacheEntryTestSetup();

            mockRequest(defaultPath, {}, { pathTemplateData: defaultPathTemplateData }, ({ body, headers }) => {
              fetchMock.mock(matcher, { body, headers, status: 404 });
            });

            response = await restClient.getProduct({ pathTemplateData: idPathTemplateData });
          });

          afterAll(async () => {
            await tearDownTest({ fetchMock, restClient });
          });

          it("SHOULD have made one request", () => {
            expect(fetchMock.calls().length).toBe(1);
          });

          it("SHOULD return the correct response", () => {
            expect(response).toEqual(
              expect.objectContaining({
                data: {},
                errors: [new Error(RESOURCE_NOT_FOUND_ERROR)],
              }),
            );
          });
        });
      });
    });

    describe("WHEN a request is redirected more than five times", () => {
      const REDIRECT_COOKIE_FLAG = "status=redirect";

      function matcher(_url: string, { headers }: MockRequest) {
        return !!headers && (headers as StringObject)[COOKIE_HEADER] === REDIRECT_COOKIE_FLAG;
      }

      beforeAll(async () => {
        mockRequest(
          defaultPath,
          {},
          { headers: { [LOCATION_HEADER]: basePath }, pathTemplateData: defaultPathTemplateData },
          ({ body, headers }) => {
            fetchMock.mock(matcher, { body, headers, status: 301 });
          },
        );

        response = await restClient.getProduct({
          headers: { [COOKIE_HEADER]: REDIRECT_COOKIE_FLAG },
          pathTemplateData: idPathTemplateData,
        });
      });

      afterAll(async () => {
        await tearDownTest({ fetchMock, restClient });
      });

      it("SHOULD have made five requests", () => {
        expect(fetchMock.calls().length).toBe(5);
      });

      it("SHOULD return the correct response", () => {
        expect(response).toEqual(
          expect.objectContaining({
            errors: [new Error(`${MAX_REDIRECTS_EXCEEDED_ERROR} 5.`)],
          }),
        );
      });
    });

    describe("WHEN a request is retried more than three times", () => {
      const RETRY_COOKIE_FLAG = "status=retry";

      function matcher(_url: string, { headers }: MockRequest) {
        return !!headers && (headers as StringObject)[COOKIE_HEADER] === RETRY_COOKIE_FLAG;
      }

      beforeAll(async () => {
        mockRequest(defaultPath, {}, { pathTemplateData: defaultPathTemplateData }, ({ body, headers }) => {
          fetchMock.mock(matcher, { body, headers, status: 500 });
        });

        response = await restClient.getProduct({
          headers: { [COOKIE_HEADER]: RETRY_COOKIE_FLAG },
          pathTemplateData: idPathTemplateData,
        });
      });

      afterAll(async () => {
        await tearDownTest({ fetchMock, restClient });
      });

      it("SHOULD have made three requests", () => {
        expect(fetchMock.calls().length).toBe(3);
      });

      it("SHOULD return the correct response", () => {
        expect(response).toEqual(
          expect.objectContaining({
            errors: [new Error(`${MAX_RETRIES_EXCEEDED_ERROR} 3.`)],
          }),
        );
      });
    });

    describe("WHEN the same resource is requested in quick succession", () => {
      beforeAll(async () => {
        mockRequest(
          defaultPath,
          PRD_136_7317.body,
          { pathTemplateData: defaultPathTemplateData },
          ({ endpoint, ...rest }) => {
            fetchMock.get(endpoint, rest);
          },
        );

        response = await Promise.all([
          restClient.get(defaultPath, { pathTemplateData: defaultPathTemplateData }),
          restClient.get(defaultPath, { pathTemplateData: defaultPathTemplateData }),
        ]);
      });

      afterAll(async () => {
        await tearDownTest({ fetchMock, restClient });
      });

      it("SHOULD have made one request", () => {
        expect(fetchMock.calls().length).toBe(1);
      });

      it("SHOULD return the correct response", () => {
        expect((response as ResponseDataWithErrors[])[0]).toEqual(
          expect.objectContaining({
            data: PRD_136_7317.body,
          }),
        );

        expect((response as ResponseDataWithErrors[])[1]).toEqual(
          expect.objectContaining({
            data: PRD_136_7317.body,
          }),
        );
      });
    });

    describe("WHEN a request times out", () => {
      // TODO
    });
  });

  describe("post method", () => {
    let restClient: Getta & ShortcutProperties<"postProduct">;
    let response: ResponseDataWithErrors | ResponseDataWithErrors[];

    beforeAll(() => {
      restClient = createRestClient<"postProduct">(
        { basePath, cache: getCache() },
        {
          postProduct: [
            defaultPath,
            {
              method: POST_METHOD,
              pathTemplateData: pathTemplateDataWithoutID,
            },
          ],
        },
      );
    });

    describe("WHEN a resource is requested", () => {
      beforeAll(async () => {
        mockRequest(
          defaultPath,
          PRD_136_7317.body,
          { pathTemplateData: defaultPathTemplateData },
          ({ endpoint, ...rest }) => {
            fetchMock.post(endpoint, rest);
          },
        );

        response = await restClient.post(defaultPath, {
          body: defaultPayload,
          pathTemplateData: defaultPathTemplateData,
        });
      });

      afterAll(async () => {
        await tearDownTest({ fetchMock, restClient });
      });

      it("SHOULD have made one request", () => {
        expect(fetchMock.calls().length).toBe(1);
      });

      it("SHOULD return the correct response", () => {
        expect(response).toEqual(
          expect.objectContaining({
            data: PRD_136_7317.body,
          }),
        );
      });
    });

    describe("WHEN a resource is requested with a shortcut", () => {
      beforeAll(async () => {
        mockRequest(
          defaultPath,
          PRD_136_7317.body,
          { pathTemplateData: defaultPathTemplateData },
          ({ endpoint, ...rest }) => {
            fetchMock.post(endpoint, rest);
          },
        );

        response = await restClient.postProduct({ body: defaultPayload, pathTemplateData: idPathTemplateData });
      });

      afterAll(async () => {
        await tearDownTest({ fetchMock, restClient });
      });

      it("SHOULD have made one request", () => {
        expect(fetchMock.calls().length).toBe(1);
      });

      it("SHOULD return the correct response", () => {
        expect(response).toEqual(
          expect.objectContaining({
            data: PRD_136_7317.body,
          }),
        );
      });
    });
  });

  describe("delete method", () => {
    let restClient: Getta & ShortcutProperties<"deleteProduct">;
    let response: ResponseDataWithErrors | ResponseDataWithErrors[];
    let requestHash: string;

    beforeAll(() => {
      restClient = createRestClient<"deleteProduct">(
        { basePath, cache: getCache() },
        {
          deleteProduct: [
            defaultPath,
            {
              method: DELETE_METHOD,
              pathTemplateData: pathTemplateDataWithoutID,
            },
          ],
        },
      );
    });

    describe("WHEN a resource is requested to be deleted", () => {
      beforeAll(async () => {
        mockRequest(
          defaultPath,
          PRD_136_7317.body,
          { pathTemplateData: defaultPathTemplateData },
          ({ endpoint, ...rest }) => {
            requestHash = md5(endpoint);
            fetchMock.get(endpoint, rest);
          },
        );

        response = await restClient.get(defaultPath, { pathTemplateData: defaultPathTemplateData });
        fetchMock.restore();

        mockRequest(defaultPath, {}, { pathTemplateData: defaultPathTemplateData }, ({ endpoint, ...rest }) => {
          fetchMock.delete(endpoint, rest);
        });

        response = await restClient.delete(defaultPath, { pathTemplateData: defaultPathTemplateData });
      });

      afterAll(async () => {
        await tearDownTest({ fetchMock, restClient });
      });

      it("SHOULD have made one request", () => {
        expect(fetchMock.calls().length).toBe(1);
      });

      it("SHOULD return the correct response", () => {
        expect(response).toEqual(
          expect.objectContaining({
            data: {},
          }),
        );
      });

      it("SHOULD delete any matching cache entry", async () => {
        expect(await restClient?.cache?.has(requestHash)).toBe(false);
      });
    });

    describe("WHEN a resource is requested to be deleted with a shortcut", () => {
      beforeAll(async () => {
        mockRequest(
          defaultPath,
          PRD_136_7317.body,
          { pathTemplateData: defaultPathTemplateData },
          ({ endpoint, ...rest }) => {
            requestHash = md5(endpoint);
            fetchMock.get(endpoint, rest);
          },
        );

        response = await restClient.get(defaultPath, { pathTemplateData: defaultPathTemplateData });
        fetchMock.restore();

        mockRequest(defaultPath, {}, { pathTemplateData: defaultPathTemplateData }, ({ endpoint, ...rest }) => {
          fetchMock.delete(endpoint, rest);
        });

        response = await restClient.deleteProduct({ pathTemplateData: idPathTemplateData });
      });

      afterAll(async () => {
        await tearDownTest({ fetchMock, restClient });
      });

      it("SHOULD have made one request", () => {
        expect(fetchMock.calls().length).toBe(1);
      });

      it("SHOULD return the correct response", () => {
        expect(response).toEqual(
          expect.objectContaining({
            data: {},
          }),
        );
      });

      it("SHOULD delete any matching cache entry", async () => {
        expect(await restClient?.cache?.has(requestHash)).toBe(false);
      });
    });
  });

  describe("put method", () => {
    let restClient: Getta & ShortcutProperties<"putProduct">;
    let response: ResponseDataWithErrors | ResponseDataWithErrors[];

    beforeAll(() => {
      restClient = createRestClient<"putProduct">(
        { basePath, cache: getCache() },
        {
          putProduct: [
            defaultPath,
            {
              method: PUT_METHOD,
              pathTemplateData: pathTemplateDataWithoutID,
            },
          ],
        },
      );
    });

    describe("WHEN a resource is send", () => {
      beforeAll(async () => {
        mockRequest(defaultPath, {}, { pathTemplateData: defaultPathTemplateData }, ({ endpoint, ...rest }) => {
          fetchMock.put(endpoint, rest);
        });

        response = await restClient.put(defaultPath, {
          body: defaultPayload,
          pathTemplateData: defaultPathTemplateData,
        });
      });

      afterAll(async () => {
        await tearDownTest({ fetchMock, restClient });
      });

      it("SHOULD have made one request", () => {
        expect(fetchMock.calls().length).toBe(1);
      });

      it("SHOULD return the correct response", () => {
        expect(response).toEqual(
          expect.objectContaining({
            data: {},
          }),
        );
      });
    });

    describe("WHEN a resource is sent with a shortcut", () => {
      beforeAll(async () => {
        mockRequest(defaultPath, {}, { pathTemplateData: defaultPathTemplateData }, ({ endpoint, ...rest }) => {
          fetchMock.put(endpoint, rest);
        });

        response = await restClient.putProduct({ body: defaultPayload, pathTemplateData: idPathTemplateData });
      });

      afterAll(async () => {
        await tearDownTest({ fetchMock, restClient });
      });

      it("SHOULD have made one request", () => {
        expect(fetchMock.calls().length).toBe(1);
      });

      it("SHOULD return the correct response", () => {
        expect(response).toEqual(
          expect.objectContaining({
            data: {},
          }),
        );
      });
    });
  });

  describe("rate limiting", () => {
    let restClient: Getta;

    beforeAll(() => {
      restClient = createRestClient({ basePath });
    });

    describe("WHEN the number of requests per second exceeds rateLimitPerSecond", () => {
      beforeAll(async () => {
        const requestKeys = [...Array(55).keys()];

        requestKeys.forEach(key => {
          mockRequest(`product/${key}`, {}, {}, ({ endpoint, ...rest }) => {
            fetchMock.get(endpoint, rest);
          });
        });

        // @ts-ignore
        restClient._addRequestToRateLimitedQueue = jest
          .fn()
          .mockResolvedValue({ data: {}, headers: new Headers(), status: 200 });

        await Promise.all(requestKeys.map(key => restClient.get(`product/${key}`)));
      });

      afterAll(async () => {
        await tearDownTest({ fetchMock, restClient });
      });

      it("SHOULD call fetch one less than the rate limit", () => {
        expect(fetchMock.calls().length).toBe(49);
      });

      it("SHOULD add the excess requests to rateLimitedRequestQueue", async () => {
        // @ts-ignore
        expect(restClient._addRequestToRateLimitedQueue).toHaveBeenCalledTimes(6);
      });
    });
  });
});
