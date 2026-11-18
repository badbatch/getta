import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { performance } from 'node:perf_hooks';
import { createRestClient } from './main.ts';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Response body handling', () => {
  it.each([204, 205, 304])(
    'When status %i exposes an empty body stream, then the client skips body reading and parsing',
    async status => {
      // Arrange
      // Simulate browsers that expose a stream even though the status forbids a body.
      const response = new Response('');
      jest.spyOn(response, 'status', 'get').mockReturnValue(status);
      const readBody = jest.spyOn(response, 'json');
      const bodyParser = jest.fn((body: unknown) => body);
      jest.spyOn(globalThis, 'fetch').mockResolvedValue(response);
      const client = createRestClient({ basePath: 'https://example.invalid', bodyParser, performance });
      expect(response.body).not.toBeNull();

      // Act
      const result = await client.delete('/record');

      // Assert
      expect(result.status).toBe(status);
      expect(result.data).toBeUndefined();
      expect(readBody).not.toHaveBeenCalled();
      expect(bodyParser).not.toHaveBeenCalled();
    },
  );

  it('When a JSON response has content, then the client still parses its fields', async () => {
    // Arrange
    const body = { title: 'Record is in use.' };
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(body, { status: 409 }));
    const client = createRestClient({ basePath: 'https://example.invalid', performance });

    // Act
    const result = await client.delete('/record');

    // Assert
    expect(result.status).toBe(409);
    expect(result.data).toEqual(body);
  });

  it('When a JSON response has malformed content, then parsing still fails', async () => {
    // Arrange
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('invalid JSON'));
    const client = createRestClient({ basePath: 'https://example.invalid', performance });

    // Act / Assert
    await expect(client.get('/record')).rejects.toMatchObject({ name: 'SyntaxError' });
  });

  it('When a text reader and custom parser are configured, then ordinary responses still use them', async () => {
    // Arrange
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('record'));
    const bodyParser = jest.fn((body: unknown) => ({ body }));

    const client = createRestClient({
      basePath: 'https://example.invalid',
      bodyParser,
      performance,
      streamReader: 'text',
    });

    // Act
    const result = await client.get('/record');

    // Assert
    expect(result.data).toEqual({ body: 'record' });
    expect(bodyParser).toHaveBeenCalledWith('record');
  });
});
