import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { HttpRequest } from '../../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../../src/server/HttpResponse';
import type { OperationHttpHandler } from '../../../../src/server/OperationHttpHandler';
import { OperationRouterHandler } from '../../../../src/server/util/OperationRouterHandler';

describe('An OperationRouterHandler', (): void => {
  const request: HttpRequest = {} as any;
  const response: HttpResponse = {} as any;
  let operation: Operation;
  let handler: jest.Mocked<OperationHttpHandler>;
  let router: OperationRouterHandler;

  beforeEach(async(): Promise<void> => {
    operation = {
      method: 'GET',
      target: { path: 'http://example.com/foo' },
      preferences: {},
      body: new BasicRepresentation(),
    };

    handler = {
      canHandle: jest.fn(),
      handle: jest.fn(),
    } as any;

    router = new OperationRouterHandler({
      baseUrl: 'http://example.com/',
      handler,
      allowedPathNames: [ '^/foo$' ],
      allowedMethods: [ 'GET' ],
    });
  });

  it('passes the operation values.', async(): Promise<void> => {
    await expect(router.canHandle({ operation, request, response })).resolves.toBeUndefined();
    operation.method = 'POST';
    await expect(router.canHandle({ operation, request, response })).rejects.toThrow('POST is not allowed.');
    operation.method = 'GET';
    operation.target = { path: 'http://example.com/wrong' };
    await expect(router.canHandle({ operation, request, response })).rejects.toThrow('Cannot handle route /wrong');
  });
});
