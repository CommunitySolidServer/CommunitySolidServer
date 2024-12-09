import type { PermissionMap } from '@solidlab/policy-engine';
import { ACL, PERMISSIONS } from '@solidlab/policy-engine';
import type { Credentials } from '../../../src/authentication/Credentials';
import { AuthAuxiliaryReader } from '../../../src/authorization/AuthAuxiliaryReader';
import type { PermissionReader } from '../../../src/authorization/PermissionReader';
import type { AccessMap, MultiPermissionMap } from '../../../src/authorization/permissions/Permissions';
import type { AuxiliaryStrategy } from '../../../src/http/auxiliary/AuxiliaryStrategy';
import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import { IdentifierMap, IdentifierSetMultiMap } from '../../../src/util/map/IdentifierMap';
import { joinUrl } from '../../../src/util/PathUtil';
import { compareMaps } from '../../util/Util';

describe('An AuthAuxiliaryReader', (): void => {
  const baseUrl = 'http://example.com/';
  const subject1 = { path: joinUrl(baseUrl, 'foo/') };
  const acl1 = { path: joinUrl(subject1.path, '.acl') };
  const subject2 = { path: joinUrl(baseUrl, 'bar/') };
  const acl2 = { path: joinUrl(subject2.path, '.acl') };
  const credentials: Credentials = {};
  let requestedModes: AccessMap;
  let sourceResult: MultiPermissionMap;
  let aclStrategy: jest.Mocked<AuxiliaryStrategy>;
  let source: jest.Mocked<PermissionReader>;
  let reader: AuthAuxiliaryReader;

  beforeEach(async(): Promise<void> => {
    requestedModes = new IdentifierSetMultiMap();

    sourceResult = new IdentifierMap();

    aclStrategy = {
      isAuxiliaryIdentifier: jest.fn((identifier): boolean => identifier.path.endsWith('.acl')),
      getSubjectIdentifier: jest.fn((identifier): ResourceIdentifier => ({ path: identifier.path.slice(0, -4) })),
    } as any;

    source = { handleSafe: jest.fn().mockResolvedValue(sourceResult) } as any;
    reader = new AuthAuxiliaryReader(source, aclStrategy);
  });

  it('requires control permissions on the subject resource to do everything.', async(): Promise<void> => {
    requestedModes.set(acl1, PERMISSIONS.Read);
    requestedModes.set(acl2, PERMISSIONS.Read);
    sourceResult.set(subject1, { [ACL.Control]: true });

    const result = await reader.handle({ requestedModes, credentials });
    expect(result.get(acl1))
      .toEqual({
        [PERMISSIONS.Read]: true,
        [PERMISSIONS.Append]: true,
        [PERMISSIONS.Modify]: true,
        [ACL.Control]: true,
        [PERMISSIONS.Create]: true,
        [PERMISSIONS.Delete]: true,
      });
    expect(result.get(acl2)).toEqual({});

    const updatedMap = new IdentifierMap();
    updatedMap.set(subject1, new Set([ ACL.Control ]));
    updatedMap.set(subject2, new Set([ ACL.Control ]));
    expect(source.handleSafe).toHaveBeenCalledTimes(1);
    expect(source.handleSafe.mock.calls[0][0].credentials).toBe(credentials);
    compareMaps(source.handleSafe.mock.calls[0][0].requestedModes, updatedMap);
    expect(source.handleSafe.mock.calls[0][0].requestedModes).not.toEqual(requestedModes);
  });

  it('combines the modes with the subject resource if it is also being requested.', async(): Promise<void> => {
    requestedModes.set(acl1, PERMISSIONS.Read);
    requestedModes.set(subject1, PERMISSIONS.Modify);

    const resultSet = { [PERMISSIONS.Read]: true, [PERMISSIONS.Modify]: true, [ACL.Control]: true };
    sourceResult.set(subject1, resultSet);
    const resultMap: MultiPermissionMap = new IdentifierMap<PermissionMap>([
      [ acl1, {
        [PERMISSIONS.Read]: true,
        [PERMISSIONS.Modify]: true,
        [ACL.Control]: true,
        [PERMISSIONS.Append]: true,
        [PERMISSIONS.Create]: true,
        [PERMISSIONS.Delete]: true,
      }],
      [ subject1, resultSet ],
    ]);
    compareMaps(await reader.handle({ credentials, requestedModes }), resultMap);
    expect(source.handleSafe.mock.calls[0][0].requestedModes.get(subject1))
      .toEqual(new Set([ PERMISSIONS.Modify, ACL.Control ]));
  });
});
