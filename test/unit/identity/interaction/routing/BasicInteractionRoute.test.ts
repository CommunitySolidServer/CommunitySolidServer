import type { Operation } from '../../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../../src/http/representation/Representation';
import type {
  InteractionHandler,
} from '../../../../../src/identity/interaction/InteractionHandler';
import { BasicInteractionRoute } from '../../../../../src/identity/interaction/routing/BasicInteractionRoute';
import { APPLICATION_JSON } from '../../../../../src/util/ContentTypes';
import { NotFoundHttpError } from '../../../../../src/util/errors/NotFoundHttpError';
import { createPostJsonOperation } from '../email-password/handler/Util';

describe('A BasicInteractionRoute', (): void => {
  const path = 'http://example.com/idp/path/';
  let operation: Operation;
  let representation: Representation;
  let source: jest.Mocked<InteractionHandler>;
  let route: BasicInteractionRoute;

  beforeEach(async(): Promise<void> => {
    operation = createPostJsonOperation({}, 'http://example.com/idp/path/');

    representation = new BasicRepresentation(JSON.stringify({}), APPLICATION_JSON);

    source = {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue(representation),
    } as any;

    route = new BasicInteractionRoute(path, source);
  });

  it('returns the given path.', async(): Promise<void> => {
    expect(route.getPath()).toBe('http://example.com/idp/path/');
  });

  it('rejects other paths.', async(): Promise<void> => {
    operation = createPostJsonOperation({}, 'http://example.com/idp/otherPath/');
    await expect(route.canHandle({ operation })).rejects.toThrow(NotFoundHttpError);
  });

  it('rejects input its source cannot handle.', async(): Promise<void> => {
    source.canHandle.mockRejectedValueOnce(new Error('bad data'));
    await expect(route.canHandle({ operation })).rejects.toThrow('bad data');
  });

  it('can handle requests its source can handle.', async(): Promise<void> => {
    await expect(route.canHandle({ operation })).resolves.toBeUndefined();
  });

  it('lets its source handle requests.', async(): Promise<void> => {
    await expect(route.handle({ operation })).resolves.toBe(representation);
  });

  it('defaults to an UnsupportedAsyncHandler if no source is provided.', async(): Promise<void> => {
    route = new BasicInteractionRoute(path);
    await expect(route.canHandle({ operation })).rejects.toThrow('This route has no associated handler.');
    await expect(route.handle({ operation })).rejects.toThrow('This route has no associated handler.');
  });
});
