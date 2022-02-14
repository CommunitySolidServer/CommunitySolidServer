import type { Operation } from '../../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../../src/http/representation/Representation';
import type { InteractionHandler } from '../../../../../src/identity/interaction/InteractionHandler';
import type { InteractionRoute } from '../../../../../src/identity/interaction/routing/InteractionRoute';
import { InteractionRouteHandler } from '../../../../../src/identity/interaction/routing/InteractionRouteHandler';
import { APPLICATION_JSON } from '../../../../../src/util/ContentTypes';
import { NotFoundHttpError } from '../../../../../src/util/errors/NotFoundHttpError';
import { createPostJsonOperation } from '../email-password/handler/Util';

describe('An InteractionRouteHandler', (): void => {
  const path = 'http://example.com/idp/path/';
  let operation: Operation;
  let representation: Representation;
  let route: InteractionRoute;
  let source: jest.Mocked<InteractionHandler>;
  let handler: InteractionRouteHandler;

  beforeEach(async(): Promise<void> => {
    operation = createPostJsonOperation({}, path);

    representation = new BasicRepresentation(JSON.stringify({}), APPLICATION_JSON);

    route = {
      getPath: jest.fn().mockReturnValue(path),
    };

    source = {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue(representation),
    } as any;

    handler = new InteractionRouteHandler(route, source);
  });

  it('rejects other paths.', async(): Promise<void> => {
    operation = createPostJsonOperation({}, 'http://example.com/idp/otherPath/');
    await expect(handler.canHandle({ operation })).rejects.toThrow(NotFoundHttpError);
  });

  it('rejects input its source cannot handle.', async(): Promise<void> => {
    source.canHandle.mockRejectedValueOnce(new Error('bad data'));
    await expect(handler.canHandle({ operation })).rejects.toThrow('bad data');
  });

  it('can handle requests its source can handle.', async(): Promise<void> => {
    await expect(handler.canHandle({ operation })).resolves.toBeUndefined();
  });

  it('lets its source handle requests.', async(): Promise<void> => {
    await expect(handler.handle({ operation })).resolves.toBe(representation);
  });
});
