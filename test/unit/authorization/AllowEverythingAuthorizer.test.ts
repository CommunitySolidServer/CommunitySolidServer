import { AllowEverythingAuthorizer } from '../../../src/authorization/AllowEverythingAuthorizer';
import type { PermissionSet } from '../../../src/ldp/permissions/PermissionSet';

describe('An AllowEverythingAuthorizer', (): void => {
  const authorizer = new AllowEverythingAuthorizer();
  const allowEverything: PermissionSet = {
    read: true,
    write: true,
    append: true,
    control: true,
  };

  it('can handle everything.', async(): Promise<void> => {
    await expect(authorizer.canHandle({} as any)).resolves.toBeUndefined();
  });

  it('always returns an empty Authorization.', async(): Promise<void> => {
    await expect(authorizer.handle()).resolves.toEqual({
      user: allowEverything,
      everyone: allowEverything,
    });
  });
});
