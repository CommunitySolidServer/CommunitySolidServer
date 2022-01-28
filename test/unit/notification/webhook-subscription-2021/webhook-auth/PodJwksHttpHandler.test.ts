import { createRequest } from 'node-mocks-http';
import type { PodJwksHttpHandlerArgs }
  from '../../../../../src/notification/webhook-subscription-2021/webhook-auth/PodJwksHttpHandler';
import { POD_JWKS_KEY, PodJwksHttpHandler }
  from '../../../../../src/notification/webhook-subscription-2021/webhook-auth/PodJwksHttpHandler';

import type { HttpResponse } from '../../../../../src/server/HttpResponse';
import { guardStream } from '../../../../../src/util/GuardedStream';

describe('A PodJwksHttpHandler', (): void => {
  const request = guardStream(createRequest());
  const response = {
    setHeader: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
  } as unknown as HttpResponse;
  const map = new Map();
  map.set(POD_JWKS_KEY, 'POD_JWKS_PUBLIC_KEY');
  const arg: PodJwksHttpHandlerArgs = {
    jwksKeyGenerator: {
      getPrivateJwks: jest.fn(),
      getPublicJwks: (id: string): any => map.get(id),
    },
  };
  const handler = new PodJwksHttpHandler(arg);
  it('handles returns the generated public key.', async(): Promise<void> => {
    await handler.handle({ request, response });
    expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'application/ld+json');
    expect(response.write).toHaveBeenCalledWith('"POD_JWKS_PUBLIC_KEY"');
    expect(response.end).toHaveBeenCalledTimes(1);
  });
});
