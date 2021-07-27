import { AllowAllAuthorizer } from '../../../src/authorization/AllowAllAuthorizer';
import type { PermissionSet } from '../../../src/ldp/permissions/PermissionSet';

describe('An AllowAllAuthorizer', (): void => {
  const authorizer = new AllowAllAuthorizer();
  const allowAll: PermissionSet = {
    read: true,
    write: true,
    append: true,
    control: true,
  };

  it('can handle everything.', async(): Promise<void> => {
    await expect(authorizer.canHandle({} as any)).resolves.toBeUndefined();
  });

  it('always returns a full access Authorization.', async(): Promise<void> => {
    await expect(authorizer.handle()).resolves.toEqual({
      user: allowAll,
      everyone: allowAll,
    });
  });
});
