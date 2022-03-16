import { BaseAccountIdRoute } from '../../../../../src/identity/interaction/account/AccountIdRoute';
import {
  BaseClientCredentialsIdRoute,
} from '../../../../../src/identity/interaction/client-credentials/util/ClientCredentialsIdRoute';
import {
  AbsolutePathInteractionRoute,
} from '../../../../../src/identity/interaction/routing/AbsolutePathInteractionRoute';

describe('A BaseClientCredentialsIdRoute', (): void => {
  it('uses the Credentials ID key.', async(): Promise<void> => {
    const credentialsIdRoute = new BaseClientCredentialsIdRoute(new BaseAccountIdRoute(
      new AbsolutePathInteractionRoute('http://example.com/'),
    ));
    expect(credentialsIdRoute.matchPath('http://example.com/123/456/'))
      .toEqual({ accountId: '123', clientCredentialsId: '456' });
  });
});
