import type { PermissionMap } from '@solidlab/policy-engine';
import { PERMISSIONS } from '@solidlab/policy-engine';
import { AllStaticReader } from '../../../src/authorization/AllStaticReader';
import { IdentifierMap, IdentifierSetMultiMap } from '../../../src/util/map/IdentifierMap';
import { compareMaps } from '../../util/Util';

function getPermissions(allow: boolean): PermissionMap {
  return {
    [PERMISSIONS.Read]: allow,
    [PERMISSIONS.Modify]: allow,
    [PERMISSIONS.Append]: allow,
    [PERMISSIONS.Create]: allow,
    [PERMISSIONS.Delete]: allow,
  };
}

describe('An AllStaticReader', (): void => {
  const credentials = {};
  const identifier = { path: 'http://test.com/resource' };

  it('can handle everything.', async(): Promise<void> => {
    const authorizer = new AllStaticReader(true);
    await expect(authorizer.canHandle({} as any)).resolves.toBeUndefined();
  });

  it('always returns permissions matching the given allow parameter.', async(): Promise<void> => {
    let authorizer = new AllStaticReader(true);
    const requestedModes = new IdentifierSetMultiMap<string>([[ identifier, PERMISSIONS.Read ]]);
    let result = await authorizer.handle({ credentials, requestedModes });
    compareMaps(result, new IdentifierMap([[ identifier, getPermissions(true) ]]));

    authorizer = new AllStaticReader(false);

    result = await authorizer.handle({ credentials, requestedModes });
    compareMaps(result, new IdentifierMap([[ identifier, getPermissions(false) ]]));
  });
});
