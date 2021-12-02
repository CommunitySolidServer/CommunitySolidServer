import type {
  InteractionHandler,
} from '../../../../../src/identity/interaction/InteractionHandler';
import type { InteractionRoute } from '../../../../../src/identity/interaction/routing/InteractionRoute';
import { RelativeInteractionRoute } from '../../../../../src/identity/interaction/routing/RelativeInteractionRoute';

describe('A RelativeInteractionRoute', (): void => {
  const relativePath = '/relative/';
  let route: jest.Mocked<InteractionRoute>;
  let source: jest.Mocked<InteractionHandler>;
  let relativeRoute: RelativeInteractionRoute;

  beforeEach(async(): Promise<void> => {
    route = {
      getPath: jest.fn().mockReturnValue('http://example.com/'),
    } as any;

    source = {
      canHandle: jest.fn(),
    } as any;
  });

  it('returns the joined path.', async(): Promise<void> => {
    relativeRoute = new RelativeInteractionRoute(route, relativePath, source);
    expect(relativeRoute.getPath()).toBe('http://example.com/relative/');

    relativeRoute = new RelativeInteractionRoute('http://example.com/', relativePath, source);
    expect(relativeRoute.getPath()).toBe('http://example.com/relative/');
  });
});
