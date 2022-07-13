import { PodJwksHttpHandler } from '../../../../src/http/identity/PodJwksHttpHandler';
import type { JwksKeyGenerator } from '../../../../src/identity/configuration/JwksKeyGenerator';
import type { HttpHandlerInput } from '../../../../src/server/HttpHandler';
import type { HttpResponse } from '../../../../src/server/HttpResponse';

describe('A PodJwksHttpHandler', (): void => {
  const mockResponse = {
    setHeader: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
  } as unknown as HttpResponse;

  let mockJwksKeyGenerator: JwksKeyGenerator;
  let handler: PodJwksHttpHandler;

  beforeEach((): void => {
    mockJwksKeyGenerator = {
      getPublicJwks: jest.fn((): any => 'POD_JWKS_PUBLIC_KEY'),
    } as unknown as JwksKeyGenerator;
    handler = new PodJwksHttpHandler(mockJwksKeyGenerator);
  });

  it('should handle and return a request as expected.', async(): Promise<void> => {
    await handler.handle({ response: mockResponse } as unknown as HttpHandlerInput);
    expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/ld+json');
    expect(mockResponse.write).toHaveBeenCalledWith('"POD_JWKS_PUBLIC_KEY"');
    expect(mockResponse.end).toHaveBeenCalledTimes(1);
  });
});
