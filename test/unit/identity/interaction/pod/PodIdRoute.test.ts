import { BaseAccountIdRoute } from '../../../../../src/identity/interaction/account/AccountIdRoute';
import { BasePodIdRoute } from '../../../../../src/identity/interaction/pod/PodIdRoute';
import {
  AbsolutePathInteractionRoute,
} from '../../../../../src/identity/interaction/routing/AbsolutePathInteractionRoute';

describe('A BasePodIdRoute', (): void => {
  it('uses the Pod ID key.', async(): Promise<void> => {
    const podIdRoute = new BasePodIdRoute(new BaseAccountIdRoute(
      new AbsolutePathInteractionRoute('http://example.com/'),
    ));
    expect(podIdRoute.matchPath('http://example.com/123/456/')).toEqual({ accountId: '123', podId: '456' });
  });
});
