import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type {
  JsonInteractionHandler,
  JsonInteractionHandlerInput,
} from '../../../../../src/identity/interaction/JsonInteractionHandler';
import type { InteractionRoute } from '../../../../../src/identity/interaction/routing/InteractionRoute';
import { InteractionRouteHandler } from '../../../../../src/identity/interaction/routing/InteractionRouteHandler';
import { NotFoundHttpError } from '../../../../../src/util/errors/NotFoundHttpError';

describe('An InteractionRouteHandler', (): void => {
  const path = 'http://example.com/foo/';
  let input: JsonInteractionHandlerInput;
  let route: jest.Mocked<InteractionRoute<'base'>>;
  let source: jest.Mocked<JsonInteractionHandler>;
  let handler: InteractionRouteHandler<InteractionRoute<'base'>>;

  beforeEach(async(): Promise<void> => {
    input = {
      target: { path },
      json: { data: 'data' },
      metadata: new RepresentationMetadata(),
      method: 'GET',
    };

    route = {
      getPath: jest.fn().mockReturnValue(path),
      matchPath: jest.fn().mockReturnValue({ base: 'base' }),
    };

    source = {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue('response'),
    } as any;

    handler = new InteractionRouteHandler(route, source);
  });

  it('rejects other paths.', async(): Promise<void> => {
    route.matchPath.mockReturnValueOnce(undefined);
    await expect(handler.canHandle(input)).rejects.toThrow(NotFoundHttpError);
  });

  it('rejects input its source cannot handle.', async(): Promise<void> => {
    source.canHandle.mockRejectedValueOnce(new Error('bad data'));
    await expect(handler.canHandle(input)).rejects.toThrow('bad data');
  });

  it('can handle requests its source can handle.', async(): Promise<void> => {
    await expect(handler.canHandle(input)).resolves.toBeUndefined();
  });

  it('lets its source handle requests.', async(): Promise<void> => {
    await expect(handler.handle(input)).resolves.toBe('response');
  });
});
