import type { Credentials } from '../../../src/authentication/Credentials';
import { AuthAuxiliaryReader } from '../../../src/authorization/AuthAuxiliaryReader';
import type { PermissionReader } from '../../../src/authorization/PermissionReader';
import { AclMode } from '../../../src/authorization/permissions/AclPermissionSet';
import type { AccessMap, PermissionMap, PermissionSet } from '../../../src/authorization/permissions/Permissions';
import { AccessMode } from '../../../src/authorization/permissions/Permissions';
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
  let sourceResult: PermissionMap;
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
    requestedModes.set(acl1, AccessMode.read);
    requestedModes.set(acl2, AccessMode.read);
    sourceResult.set(subject1, { control: true } as PermissionSet);

    const result = await reader.handle({ requestedModes, credentials });
    expect(result.get(acl1)).toEqual({ read: true, append: true, write: true, control: true });
    expect(result.get(acl2)).toEqual({});

    const updatedMap = new IdentifierMap();
    updatedMap.set(subject1, new Set([ AclMode.control ]));
    updatedMap.set(subject2, new Set([ AclMode.control ]));
    expect(source.handleSafe).toHaveBeenCalledTimes(1);
    expect(source.handleSafe.mock.calls[0][0].credentials).toBe(credentials);
    compareMaps(source.handleSafe.mock.calls[0][0].requestedModes, updatedMap);
    expect(source.handleSafe.mock.calls[0][0].requestedModes).not.toEqual(requestedModes);
  });

  it('combines the modes with the subject resource if it is also being requested.', async(): Promise<void> => {
    requestedModes.set(acl1, AccessMode.read);
    requestedModes.set(subject1, AccessMode.write);

    const resultSet = { read: true, write: true, control: true } as PermissionSet;
    sourceResult.set(subject1, resultSet);
    const resultMap: PermissionMap = new IdentifierMap([
      [ acl1, { read: true, write: true, control: true, append: true } as PermissionSet ],
      [ subject1, resultSet ],
    ]);
    compareMaps(await reader.handle({ credentials, requestedModes }), resultMap);
    expect(source.handleSafe.mock.calls[0][0].requestedModes.get(subject1))
      .toEqual(new Set([ AccessMode.write, AclMode.control ]));
  });
});
