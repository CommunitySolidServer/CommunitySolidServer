import { CredentialGroup } from '../../../src/authentication/Credentials';
import { AllStaticReader } from '../../../src/authorization/AllStaticReader';
import type { Permission } from '../../../src/authorization/permissions/Permissions';
import { AccessMode } from '../../../src/authorization/permissions/Permissions';
import { IdentifierMap, IdentifierSetMultiMap } from '../../../src/util/map/IdentifierMap';
import { compareMaps } from '../../util/Util';

function getPermissions(allow: boolean): Permission {
  return {
    read: allow,
    write: allow,
    append: allow,
    create: allow,
    delete: allow,
  };
}

describe('An AllStaticReader', (): void => {
  const credentials = { [CredentialGroup.agent]: {}};
  const identifier = { path: 'http://test.com/resource' };

  it('can handle everything.', async(): Promise<void> => {
    const authorizer = new AllStaticReader(true);
    await expect(authorizer.canHandle({} as any)).resolves.toBeUndefined();
  });

  it('always returns permissions matching the given allow parameter.', async(): Promise<void> => {
    let authorizer = new AllStaticReader(true);
    const requestedModes = new IdentifierSetMultiMap<AccessMode>([[ identifier, AccessMode.read ]]);
    let result = await authorizer.handle({ credentials, requestedModes });
    compareMaps(result, new IdentifierMap([[ identifier, { [CredentialGroup.agent]: getPermissions(true) }]]));

    authorizer = new AllStaticReader(false);

    result = await authorizer.handle({ credentials, requestedModes });
    compareMaps(result, new IdentifierMap([[ identifier, { [CredentialGroup.agent]: getPermissions(false) }]]));
  });
});
