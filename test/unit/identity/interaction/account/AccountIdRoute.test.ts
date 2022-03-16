import { BaseAccountIdRoute } from '../../../../../src/identity/interaction/account/AccountIdRoute';
import {
  AbsolutePathInteractionRoute,
} from '../../../../../src/identity/interaction/routing/AbsolutePathInteractionRoute';

describe('A BaseAccountIdRoute', (): void => {
  it('uses the Account ID key.', async(): Promise<void> => {
    const accountIdRoute = new BaseAccountIdRoute(new AbsolutePathInteractionRoute('http://example.com/'));
    expect(accountIdRoute.matchPath('http://example.com/123/')).toEqual({ accountId: '123' });
  });
});
