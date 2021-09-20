import { CredentialGroup } from '../../../src/authentication/Credentials';
import { AllStaticReader } from '../../../src/authorization/AllStaticReader';
import type { Permission } from '../../../src/ldp/permissions/Permissions';

function getPermissions(allow: boolean): Permission {
  return {
    read: allow,
    write: allow,
    append: allow,
    control: allow,
  };
}

describe('An AllStaticReader', (): void => {
  const credentials = { [CredentialGroup.agent]: {}, [CredentialGroup.public]: undefined };
  const identifier = { path: 'http://test.com/resource' };

  it('can handle everything.', async(): Promise<void> => {
    const authorizer = new AllStaticReader(true);
    await expect(authorizer.canHandle({} as any)).resolves.toBeUndefined();
  });

  it('always returns permissions matching the given allow parameter.', async(): Promise<void> => {
    let authorizer = new AllStaticReader(true);
    await expect(authorizer.handle({ credentials, identifier })).resolves.toEqual({
      [CredentialGroup.agent]: getPermissions(true),
    });

    authorizer = new AllStaticReader(false);
    await expect(authorizer.handle({ credentials, identifier })).resolves.toEqual({
      [CredentialGroup.agent]: getPermissions(false),
    });
  });
});
