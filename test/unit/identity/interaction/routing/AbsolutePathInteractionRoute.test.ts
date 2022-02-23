import {
  AbsolutePathInteractionRoute,
} from '../../../../../src/identity/interaction/routing/AbsolutePathInteractionRoute';

describe('An AbsolutePathInteractionRoute', (): void => {
  const path = 'http://example.com/idp/path/';
  const route = new AbsolutePathInteractionRoute(path);

  it('returns the given path.', async(): Promise<void> => {
    expect(route.getPath()).toBe('http://example.com/idp/path/');
  });
});
