import { BaseAccountIdRoute } from '../../../../../src/identity/interaction/account/AccountIdRoute';
import { BasePasswordIdRoute } from '../../../../../src/identity/interaction/password/util/PasswordIdRoute';
import {
  AbsolutePathInteractionRoute,
} from '../../../../../src/identity/interaction/routing/AbsolutePathInteractionRoute';

describe('A BasePasswordIdRoute', (): void => {
  it('uses the Password ID key.', async(): Promise<void> => {
    const passwordIdRoute = new BasePasswordIdRoute(new BaseAccountIdRoute(
      new AbsolutePathInteractionRoute('http://example.com/'),
    ));
    expect(passwordIdRoute.matchPath('http://example.com/123/456/')).toEqual({ accountId: '123', passwordId: '456' });
  });
});
