import { BaseAccountIdRoute } from '../../../../../src/identity/interaction/account/AccountIdRoute';
import {
  AbsolutePathInteractionRoute,
} from '../../../../../src/identity/interaction/routing/AbsolutePathInteractionRoute';
import { BaseWebIdLinkRoute } from '../../../../../src/identity/interaction/webid/WebIdLinkRoute';

describe('A WebIdLinkRoute', (): void => {
  it('uses the WebID link key.', async(): Promise<void> => {
    const webIdLinkRoute = new BaseWebIdLinkRoute(new BaseAccountIdRoute(
      new AbsolutePathInteractionRoute('http://example.com/'),
    ));
    expect(webIdLinkRoute.matchPath('http://example.com/123/456/')).toEqual({ accountId: '123', webIdLink: '456' });
  });
});
