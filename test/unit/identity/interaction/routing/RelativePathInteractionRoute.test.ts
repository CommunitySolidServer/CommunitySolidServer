import type { InteractionRoute } from '../../../../../src/identity/interaction/routing/InteractionRoute';
import {
  RelativePathInteractionRoute,
} from '../../../../../src/identity/interaction/routing/RelativePathInteractionRoute';
import { InternalServerError } from '../../../../../src/util/errors/InternalServerError';

describe('A RelativePathInteractionRoute', (): void => {
  const relativePath = '/relative/';
  let route: jest.Mocked<InteractionRoute<'base'>>;
  let relativeRoute: RelativePathInteractionRoute<'base'>;

  beforeEach(async(): Promise<void> => {
    route = {
      getPath: jest.fn().mockReturnValue('http://example.com/'),
      matchPath: jest.fn().mockReturnValue({ base: 'base' }),
    };

    relativeRoute = new RelativePathInteractionRoute(route, relativePath);
  });

  it('returns the joined path.', async(): Promise<void> => {
    expect(relativeRoute.getPath()).toBe('http://example.com/relative/');
  });

  it('matches paths by checking if the tail matches the relative path.', async(): Promise<void> => {
    expect(relativeRoute.matchPath('http://example.com/relative/')).toEqual({ base: 'base' });

    expect(relativeRoute.matchPath('http://example.com/relative')).toBeUndefined();
  });

  it('errors if the base path does not end in a slash.', async(): Promise<void> => {
    route.getPath.mockReturnValueOnce('http://example.com/foo');
    expect((): string => relativeRoute.getPath()).toThrow(InternalServerError);
  });
});
