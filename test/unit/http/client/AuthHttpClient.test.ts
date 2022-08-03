import type { RequestOptions } from 'http';
import { URL } from 'url';
import * as jose from 'jose';
import { AuthHttpClient } from '../../../../src/http/client/AuthHttpClient';
import type { HttpClient } from '../../../../src/http/client/HttpClient';
import type { JwksKeyGenerator } from '../../../../src/identity/configuration/JwksKeyGenerator';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';

describe('A AuthHttpClient', (): void => {
  const baseUrl = 'http://example.com';
  const data = 'just-some-data';
  const target = 'http://other.example.com/hooks';
  const mockAuthorizationToken = 'authorizationToken';

  let client: AuthHttpClient;
  let mockJwksKeyGenerator: JwksKeyGenerator;
  let mockHttpClient: HttpClient;
  let mockOptions: RequestOptions;

  beforeEach(async(): Promise<void> => {
    const produceJwt: jose.SignJWT = {
      setProtectedHeader: jest.fn((): any => produceJwt),
      setIssuedAt: jest.fn((): any => produceJwt),
      setIssuer: jest.fn((): any => produceJwt),
      setExpirationTime: jest.fn((): any => produceJwt),
      sign: jest.fn().mockResolvedValue(mockAuthorizationToken),
    } as unknown as jose.SignJWT;
    jest.spyOn(jose, 'SignJWT').mockImplementation((): any => produceJwt);
    jest.spyOn(jose, 'importJWK').mockResolvedValue({ type: 'mocked' });

    mockOptions = { method: 'POST' };
    mockJwksKeyGenerator = {
      getPrivateJwks: jest.fn().mockResolvedValue({
        keys: [{ dummy: 'key' }],
      }),
    } as unknown as JwksKeyGenerator;
    mockHttpClient = {
      call: jest.fn(),
    };
    client = new AuthHttpClient(
      mockJwksKeyGenerator,
      baseUrl,
      mockHttpClient,
    );
  });

  it('should throw when options.method is not set.', async(): Promise<void> => {
    const result = client.call(target, {}, data);
    await expect(result).rejects.toThrow(InternalServerError);
  });

  it('should throw when no jwks are available to create a token.', async(): Promise<void> => {
    mockJwksKeyGenerator.getPrivateJwks = jest.fn().mockResolvedValueOnce([]);
    const result = client.call(target, mockOptions, data);
    await expect(result).rejects.toThrow(InternalServerError);
  });

  it('should accept both string and URL as target url.', async(): Promise<void> => {
    const result = client.call(target, mockOptions, data);
    await expect(result).resolves.toBeUndefined();
    const resultUrl = client.call(new URL(target), mockOptions, data);
    await expect(resultUrl).resolves.toBeUndefined();
  });

  it('should call the child HttpClient with the correct auth token.', async(): Promise<void> => {
    const result = client.call(target, mockOptions, data);
    await expect(result).resolves.toBeUndefined();
    expect(mockHttpClient.call).toHaveBeenCalledTimes(1);
    expect(mockHttpClient.call).toHaveBeenCalledWith(
      new URL(target),
      { ...mockOptions, headers: { ...mockOptions.headers, authorization: mockAuthorizationToken }},
      data,
    );
  });
});
