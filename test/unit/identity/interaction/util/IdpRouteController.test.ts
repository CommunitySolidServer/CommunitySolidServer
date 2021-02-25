import {
  IdpRouteController,
} from '../../../../../src/identity/interaction/util/IdpRouteController';

describe('IdpRouteController', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(IdpRouteController).toBeDefined();
  });
});
