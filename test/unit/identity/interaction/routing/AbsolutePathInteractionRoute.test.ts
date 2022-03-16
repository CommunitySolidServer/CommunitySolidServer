import {
  AbsolutePathInteractionRoute,
} from '../../../../../src/identity/interaction/routing/AbsolutePathInteractionRoute';

describe('An AbsolutePathInteractionRoute', (): void => {
  const path = 'http://example.com/idp/path/';
  const route = new AbsolutePathInteractionRoute(path);

  it('returns the given path.', async(): Promise<void> => {
    expect(route.getPath()).toBe('http://example.com/idp/path/');
  });

  it('matches a path if it is identical to the stored path.', async(): Promise<void> => {
    expect(route.matchPath(path)).toEqual({});
    expect(route.matchPath('http://example.com/somewhere/else')).toBeUndefined();
  });
});
