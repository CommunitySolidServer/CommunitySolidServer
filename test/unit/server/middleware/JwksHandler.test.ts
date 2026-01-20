import { createRequest, createResponse, type MockResponse } from 'node-mocks-http';
import { REQUEST_METHOD } from '@solid/access-token-verifier/dist/constant/REQUEST_METHOD';
import type { Response } from 'express';
import type { HttpResponse } from '../../../../src/server/HttpResponse';
import { JwksHandler } from '../../../../src/server/middleware/JwksHandler';
import { guardStream } from '../../../../src/util/GuardedStream';
import type { AlgJwk, JwkGenerator } from '../../../../src/identity/configuration/JwkGenerator';
import { MethodNotAllowedHttpError } from '../../../../src/util/errors/MethodNotAllowedHttpError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('a JwksHandler', (): void => {
  const key: AlgJwk = { alg: 'ES256' };
  const path = 'http://example.org/.well-known/jwks.json';
  const generator: JwkGenerator = jest.mocked<JwkGenerator>({
    alg: key.alg,
    getPrivateKey: jest.fn(),
    getPublicKey: jest.fn<ReturnType<JwkGenerator['getPublicKey']>, any[]>().mockResolvedValue(key),
  });

  let handler: JwksHandler;
  let response: MockResponse<Response & HttpResponse>;

  beforeEach((): void => {
    handler = new JwksHandler(path, generator);
    response = createResponse<Response & HttpResponse>();
    jest.clearAllMocks();
  });

  it('does not handle requests with methods other than GET or HEAD.', async(): Promise<void> => {
    for (const method of REQUEST_METHOD) {
      if (method === 'GET' || method === 'HEAD') {
        continue;
      }

      const request = guardStream(createRequest({ method, url: path }));

      await expect(handler.canHandle({ request, response })).rejects.toThrow(MethodNotAllowedHttpError);
    }
  });

  it('does not handle requests with other paths than the configured on.', async(): Promise<void> => {
    const request = guardStream(createRequest({ url: 'https://example.org/other/path' }));

    await expect(handler.canHandle({ request, response })).rejects.toThrow(NotImplementedHttpError);
  });

  it('handles a HEAD request to the configured path.', async(): Promise<void> => {
    const request = guardStream(createRequest({ method: 'HEAD', url: path }));

    await handler.handleSafe({ request, response });

    expect(response.statusCode).toBe(200);
    expect(response.getHeaders()).toEqual(expect.objectContaining({ 'content-type': 'application/json' }));
  });

  it('handles a GET request to the configured path.', async(): Promise<void> => {
    const request = guardStream(createRequest({ method: 'GET', url: path }));

    await handler.handleSafe({ request, response });

    expect(generator.getPublicKey).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(200);
    expect(response.getHeaders()).toEqual(expect.objectContaining({ 'content-type': 'application/json' }));
    expect(JSON.parse(response._getData())).toEqual(expect.objectContaining({ keys: expect.arrayContaining([ key ]) }));
  });
});
