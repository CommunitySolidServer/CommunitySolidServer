import type { InteractionRoute } from '../../../../../src/identity/interaction/routing/InteractionRoute';
import {
  RelativePathInteractionRoute,
} from '../../../../../src/identity/interaction/routing/RelativePathInteractionRoute';

describe('A RelativePathInteractionRoute', (): void => {
  const relativePath = '/relative/';
  let route: jest.Mocked<InteractionRoute>;
  let relativeRoute: RelativePathInteractionRoute;

  beforeEach(async(): Promise<void> => {
    route = {
      getPath: jest.fn().mockReturnValue('http://example.com/'),
    };
  });

  it('returns the joined path.', async(): Promise<void> => {
    relativeRoute = new RelativePathInteractionRoute(route, relativePath);
    expect(relativeRoute.getPath()).toBe('http://example.com/relative/');

    relativeRoute = new RelativePathInteractionRoute('http://example.com/test/', relativePath);
    expect(relativeRoute.getPath()).toBe('http://example.com/test/relative/');
  });
});
