import { AuxiliaryReader } from '../../../src/authorization/AuxiliaryReader';
import type { PermissionReader, PermissionReaderInput } from '../../../src/authorization/PermissionReader';
import type { AccessMap, PermissionMap, PermissionSet } from '../../../src/authorization/permissions/Permissions';
import { AccessMode } from '../../../src/authorization/permissions/Permissions';
import type { AuxiliaryStrategy } from '../../../src/http/auxiliary/AuxiliaryStrategy';
import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import { map } from '../../../src/util/IterableUtil';
import { IdentifierMap, IdentifierSetMultiMap } from '../../../src/util/map/IdentifierMap';
import { compareMaps } from '../../util/Util';

describe('An AuxiliaryReader', (): void => {
  const suffix1 = '.dummy1';
  const suffix2 = '.dummy2';
  const credentials = {};
  const subjectIdentifier = { path: 'http://test.com/foo' };
  const auxiliaryIdentifier1 = { path: 'http://test.com/foo.dummy1' };
  const auxiliaryIdentifier2 = { path: 'http://test.com/foo.dummy2' };
  const permissionSet: PermissionSet = { read: true };
  let source: jest.Mocked<PermissionReader>;
  let strategy: jest.Mocked<AuxiliaryStrategy>;
  let reader: AuxiliaryReader;

  function handleSafe({ requestedModes }: PermissionReaderInput): PermissionMap {
    return new IdentifierMap(map(requestedModes.distinctKeys(), (identifier): [ResourceIdentifier, PermissionSet] =>
      [ identifier, permissionSet ]));
  }

  beforeEach(async(): Promise<void> => {
    source = {
      handleSafe: jest.fn(handleSafe),
    } as any;

    strategy = {
      isAuxiliaryIdentifier: jest.fn((identifier: ResourceIdentifier): boolean =>
        identifier.path.endsWith(suffix1) || identifier.path.endsWith(suffix2)),
      getSubjectIdentifier: jest.fn((identifier: ResourceIdentifier): ResourceIdentifier =>
        ({ path: identifier.path.slice(0, -suffix1.length) })),
      usesOwnAuthorization: jest.fn().mockReturnValue(false),
    } as any;
    reader = new AuxiliaryReader(source, strategy);
  });

  it('handles resources by sending the updated parameters to the source.', async(): Promise<void> => {
    const requestedModes: AccessMap = new IdentifierSetMultiMap<AccessMode>([
      [ auxiliaryIdentifier1, AccessMode.delete ],
      [{ path: 'http://example.com/other' }, AccessMode.read ],
    ]);
    const permissionMap: PermissionMap = new IdentifierMap([
      [ subjectIdentifier, permissionSet ],
      [{ path: 'http://example.com/other' }, permissionSet ],
      [ auxiliaryIdentifier1, permissionSet ],
    ]);
    compareMaps(await reader.handle({ credentials, requestedModes }), permissionMap);
    const mock = source.handleSafe.mock.calls[0][0];
    expect(mock.credentials).toBe(credentials);
    expect(mock.requestedModes.get(subjectIdentifier)).toEqual(new Set([ AccessMode.delete ]));
    expect(mock.requestedModes.get({ path: 'http://example.com/other' })).toEqual(new Set([ AccessMode.read ]));
    expect(mock.requestedModes.size).toBe(2);
    expect(mock.requestedModes).not.toEqual(requestedModes);
  });

  it('applies an empty PermissionSet if no permissions were found for the subject.', async(): Promise<void> => {
    source.handleSafe.mockResolvedValueOnce(new IdentifierMap());
    const requestedModes: AccessMap = new IdentifierSetMultiMap<AccessMode>([
      [ auxiliaryIdentifier1, AccessMode.delete ],
    ]);
    const permissionMap: PermissionMap = new IdentifierMap([
      [ auxiliaryIdentifier1, {}],
    ]);
    compareMaps(await reader.handle({ credentials, requestedModes }), permissionMap);
  });

  it('combines modes if multiple different auxiliary resources have the same subject.', async(): Promise<void> => {
    const requestedModes: AccessMap = new IdentifierSetMultiMap<AccessMode>([
      [ auxiliaryIdentifier1, AccessMode.write ],
      [ auxiliaryIdentifier2, AccessMode.read ],
      [ subjectIdentifier, AccessMode.delete ],
    ]);
    const resultSet = { read: true, write: true, delete: true };
    source.handleSafe.mockResolvedValueOnce(new IdentifierMap([[ subjectIdentifier, resultSet ]]));
    const permissionMap: PermissionMap = new IdentifierMap([
      [ subjectIdentifier, resultSet ],
      [ auxiliaryIdentifier1, resultSet ],
      [ auxiliaryIdentifier2, resultSet ],
    ]);
    compareMaps(await reader.handle({ credentials, requestedModes }), permissionMap);
    expect(source.handleSafe.mock.calls[0][0].requestedModes.get(subjectIdentifier))
      .toEqual(new Set([ AccessMode.write, AccessMode.read, AccessMode.delete ]));
  });
});
