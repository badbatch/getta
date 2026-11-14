import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { performance } from 'node:perf_hooks';
import { basePath, getCache } from './__testUtils__/helpers/index.ts';
import { type Getta, createRestClient } from './main.ts';

let cache: ReturnType<typeof getCache> | undefined;

const methodCases: { name: string; send: (client: Getta) => Promise<unknown> }[] = [
  { name: 'GET', send: client => client.get('/items') },
  { name: 'DELETE', send: client => client.delete('/items') },
  { name: 'POST', send: client => client.post('/items', { body: '{}' }) },
  { name: 'PUT', send: client => client.put('/items', { body: '{}' }) },
  { name: 'PATCH', send: client => client.request('/items', { body: '{}', method: 'patch' }) },
  { name: 'HEAD', send: client => client.request('/items', { method: 'head' }) },
  { name: 'OPTIONS', send: client => client.request('/items', { method: 'options' }) },
];

describe('Given a client configured with a headers factory', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    cache?.clear();
    cache = undefined;
  });

  it.each(methodCases)(
    'When $name is called, then the factory is evaluated once for that request',
    async ({ send }) => {
      // Arrange
      const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ ok: true }));
      const headers = jest.fn(() => ({ 'x-request-id': 'request-id' }));
      const client = createRestClient({ basePath, headers, performance });
      const callsBeforeRequest = headers.mock.calls.length;

      // Act
      await send(client);

      // Assert
      expect(callsBeforeRequest).toBe(0);
      expect(headers).toHaveBeenCalledTimes(1);

      expect(fetch).toHaveBeenCalledWith(
        `${basePath}/items`,
        expect.objectContaining({
          headers: expect.objectContaining({ 'content-type': 'application/json', 'x-request-id': 'request-id' }),
        }),
      );
    },
  );

  it('When successive requests are made, then each request uses fresh factory headers', async () => {
    // Arrange
    const fetch = jest.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(Response.json({})));

    const headers = jest
      .fn<() => Record<string, string>>()
      .mockReturnValueOnce({ 'x-request-id': 'first' })
      .mockReturnValueOnce({ 'x-request-id': 'second' });

    const client = createRestClient({ basePath, headers, performance });

    // Act
    await client.get('/items');
    await client.get('/items');

    // Assert
    expect(headers).toHaveBeenCalledTimes(2);

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      `${basePath}/items`,
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-request-id': 'first' }),
      }),
    );

    expect(fetch).toHaveBeenNthCalledWith(
      2,
      `${basePath}/items`,
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-request-id': 'second' }),
      }),
    );
  });

  it('When per-call headers differ in casing, then they override defaults without mutating either object', async () => {
    // Arrange
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}));
    const defaults = Object.freeze({ Authorization: 'Bearer default', 'x-client': 'Getta' });
    const overrides = Object.freeze({ 'Content-Type': 'text/plain', authorization: 'Bearer override' });
    const client = createRestClient({ basePath, headers: () => defaults, performance });

    // Act
    await client.post('/items', { body: 'payload', headers: overrides });

    // Assert
    expect(fetch.mock.calls[0]?.[1]?.headers).toEqual({
      'Content-Type': 'text/plain',
      authorization: 'Bearer override',
      'x-client': 'Getta',
    });

    expect(defaults).toEqual({ Authorization: 'Bearer default', 'x-client': 'Getta' });
    expect(overrides).toEqual({ 'Content-Type': 'text/plain', authorization: 'Bearer override' });
  });

  it('When a request is retried, then every attempt reuses the resolved headers', async () => {
    // Arrange
    const fetch = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({}, { status: 500 }))
      .mockResolvedValueOnce(Response.json({}, { status: 500 }))
      .mockResolvedValueOnce(Response.json({ ok: true }));

    const headers = jest.fn(() => ({ 'x-request-id': 'same-request' }));
    const client = createRestClient({ basePath, headers, performance, requestRetryWait: 0 });

    // Act
    await client.get('/items');

    // Assert
    const expectedHeaders = expect.objectContaining({ 'x-request-id': 'same-request' });
    expect(headers).toHaveBeenCalledTimes(1);

    expect(fetch.mock.calls.map(([, options]) => options?.headers)).toEqual([
      expectedHeaders,
      expectedHeaders,
      expectedHeaders,
    ]);
  });

  it('When a request redirects, then the redirect reuses the resolved headers', async () => {
    // Arrange
    const fetch = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(undefined, { headers: { location: `${basePath}/destination` }, status: 301 }))
      .mockResolvedValueOnce(Response.json({ ok: true }));

    const headers = jest.fn(() => ({ 'x-request-id': 'same-request' }));
    const client = createRestClient({ basePath, headers, performance });

    // Act
    await client.get('/items');

    // Assert
    expect(headers).toHaveBeenCalledTimes(1);

    expect(fetch).toHaveBeenNthCalledWith(
      2,
      `${basePath}/destination`,
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-request-id': 'same-request' }),
      }),
    );
  });

  it('When a shortcut is called, then it resolves factory headers and honors per-call overrides', async () => {
    // Arrange
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}));
    const headers = jest.fn(() => ({ 'x-request-id': 'default' }));

    const client = createRestClient<'getItem'>(
      { basePath, headers, performance },
      {
        getItem: ['/items', { method: 'get' }],
      },
    );

    // Act
    await client.getItem({ headers: { 'X-Request-Id': 'forwarded' } });

    // Assert
    expect(headers).toHaveBeenCalledTimes(1);

    expect(fetch.mock.calls[0]?.[1]?.headers).toEqual({
      'X-Request-Id': 'forwarded',
      'content-type': 'application/json',
    });
  });

  it('When tracing headers change, then an authorized GET can still use its cached response', async () => {
    // Arrange
    cache = getCache();

    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json(
        { owner: 'A' },
        {
          headers: { 'cache-control': 'public, max-age=6000' },
        },
      ),
    );

    const headers = jest
      .fn<() => Record<string, string>>()
      .mockReturnValueOnce({ authorization: 'Bearer A', 'x-request-id': 'first' })
      .mockReturnValueOnce({ authorization: 'Bearer A', 'x-request-id': 'second' });

    const client = createRestClient({ basePath, cache, headers, performance });

    // Act
    await client.get('/items');
    const cached = await client.get<{ owner: string }>('/items');

    // Assert
    expect(headers).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(cached.data.owner).toBe('A');
  });

  it('When factory authorization changes, then cached responses stay isolated by authorization value', async () => {
    // Arrange
    cache = getCache();
    const responseHeaders = { 'cache-control': 'public, max-age=6000' };

    const fetch = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ owner: 'A' }, { headers: responseHeaders }))
      .mockResolvedValueOnce(Response.json({ owner: 'B' }, { headers: responseHeaders }));

    const headers = jest
      .fn<() => Record<string, string>>()
      .mockReturnValueOnce({ Authorization: 'Bearer A' })
      .mockReturnValueOnce({ Authorization: 'Bearer B' })
      .mockReturnValueOnce({ Authorization: 'Bearer A' });

    const client = createRestClient({ basePath, cache, headers, performance });

    // Act
    const first = await client.get<{ owner: string }>('/items');
    const second = await client.get<{ owner: string }>('/items');
    const cached = await client.get<{ owner: string }>('/items');

    // Assert
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(headers).toHaveBeenCalledTimes(3);
    expect([first.data.owner, second.data.owner, cached.data.owner]).toEqual(['A', 'B', 'A']);
  });

  it('When concurrent GETs have different factory authorization, then they do not share a pending request', async () => {
    // Arrange
    const fetch = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ owner: 'A' }))
      .mockResolvedValueOnce(Response.json({ owner: 'B' }));

    const headers = jest
      .fn<() => Record<string, string>>()
      .mockReturnValueOnce({ authorization: 'Bearer A' })
      .mockReturnValueOnce({ authorization: 'Bearer B' });

    const client = createRestClient({ basePath, headers, performance });

    // Act
    const responses = await Promise.all([
      client.get<{ owner: string }>('/items'),
      client.get<{ owner: string }>('/items'),
    ]);

    // Assert
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(responses.map(response => response.data.owner)).toEqual(['A', 'B']);
  });

  it('When concurrent GETs share authorization, then tracing headers do not prevent request deduplication', async () => {
    // Arrange
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ owner: 'A' }));

    const headers = jest
      .fn<() => Record<string, string>>()
      .mockReturnValueOnce({ authorization: 'Bearer A', 'x-request-id': 'first' })
      .mockReturnValueOnce({ authorization: 'Bearer A', 'x-request-id': 'second' });

    const client = createRestClient({ basePath, headers, performance });

    // Act
    const responses = await Promise.all([client.get('/items'), client.get('/items')]);

    // Assert
    expect(headers).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(responses[0]).toBe(responses[1]);
  });

  it('When DELETE resolves authorization, then it invalidates only that authorization cache entry', async () => {
    // Arrange
    cache = getCache();
    const responseHeaders = { 'cache-control': 'public, max-age=6000' };

    const fetch = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ version: 1 }, { headers: responseHeaders }))
      .mockResolvedValueOnce(new Response(undefined, { status: 204 }))
      .mockResolvedValueOnce(new Response(undefined, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ version: 2 }, { headers: responseHeaders }));

    const headers = jest
      .fn<() => Record<string, string>>()
      .mockReturnValueOnce({ authorization: 'Bearer A' })
      .mockReturnValueOnce({ authorization: 'Bearer B' })
      .mockReturnValueOnce({ authorization: 'Bearer A' })
      .mockReturnValueOnce({ authorization: 'Bearer A' })
      .mockReturnValueOnce({ authorization: 'Bearer A' });

    const client = createRestClient({ basePath, cache, headers, performance });

    // Act
    await client.get('/items');
    await client.delete('/items');
    const stillCached = await client.get<{ version: number }>('/items');
    await client.delete('/items');
    const updated = await client.get<{ version: number }>('/items');

    // Assert
    expect(stillCached.data.version).toBe(1);
    expect(updated.data.version).toBe(2);
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(headers).toHaveBeenCalledTimes(5);
  });

  it('When the factory throws, then the request rejects before fetching and later requests can succeed', async () => {
    // Arrange
    const error = new Error('Header creation failed');
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ ok: true }));

    const headers = jest
      .fn<() => Record<string, string>>()
      .mockImplementationOnce(() => {
        throw error;
      })
      .mockReturnValueOnce({ 'x-request-id': 'next' });

    const client = createRestClient({ basePath, headers, performance });

    // Act
    const failed = client.get('/items');

    // Assert
    await expect(failed).rejects.toBe(error);
    expect(fetch).not.toHaveBeenCalled();
    await expect(client.get('/items')).resolves.toMatchObject({ data: { ok: true } });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
