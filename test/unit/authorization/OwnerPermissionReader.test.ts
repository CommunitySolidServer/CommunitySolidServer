import type { PermissionMap } from '@solidlab/policy-engine';
import { ACL, PERMISSIONS } from '@solidlab/policy-engine';
import type { Credentials } from '../../../src/authentication/Credentials';
import { OwnerPermissionReader } from '../../../src/authorization/OwnerPermissionReader';
import type { PermissionReader } from '../../../src/authorization/PermissionReader';
import type { AccessMap, MultiPermissionMap } from '../../../src/authorization/permissions/Permissions';
import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import type { PodStore } from '../../../src/identity/interaction/pod/util/PodStore';
import type { StorageLocationStrategy } from '../../../src/server/description/StorageLocationStrategy';
import { IdentifierMap, IdentifierSetMultiMap } from '../../../src/util/map/IdentifierMap';
import { compareMaps } from '../../util/Util';

describe('An OwnerPermissionReader', (): void => {
  const owner = 'http://example.com/alice/profile/card#me';
  const podBaseUrl = 'http://example.com/alice/';
  const accountId = 'accountId';
  let credentials: Credentials;
  let identifier: ResourceIdentifier;
  let requestedModes: AccessMap;
  let sourceMap: MultiPermissionMap;
  let podStore: jest.Mocked<PodStore>;
  let storageStrategy: jest.Mocked<StorageLocationStrategy>;
  let source: jest.Mocked<PermissionReader>;
  let reader: OwnerPermissionReader;

  beforeEach(async(): Promise<void> => {
    credentials = { agent: { webId: owner }};

    identifier = { path: podBaseUrl };

    requestedModes = new IdentifierSetMultiMap<string>([[ identifier, ACL.Control ], [ identifier, PERMISSIONS.Read ]]);

    podStore = {
      findByBaseUrl: jest.fn().mockResolvedValue(accountId),
      getOwners: jest.fn().mockResolvedValue([{ webId: owner, visible: false }]),
    } satisfies Partial<PodStore> as any;

    storageStrategy = {
      getStorageIdentifier: jest.fn().mockResolvedValue(podBaseUrl),
    };

    sourceMap = new IdentifierMap<PermissionMap>([[ identifier, { [PERMISSIONS.Read]: true }]]);
    source = {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue(sourceMap),
      handleSafe: jest.fn(),
    };

    reader = new OwnerPermissionReader(podStore, storageStrategy, source);
  });

  it('can handle requests its source reader can handle.', async(): Promise<void> => {
    await expect(reader.canHandle({ credentials, requestedModes })).resolves.toBeUndefined();
    expect(source.canHandle).toHaveBeenCalledTimes(1);

    source.canHandle.mockRejectedValue(new Error('just no'));
    await expect(reader.canHandle({ credentials, requestedModes })).rejects.toThrow('just no');
    expect(source.canHandle).toHaveBeenCalledTimes(2);
  });

  it('just sends the request to the source reader if there are no control requests.', async(): Promise<void> => {
    requestedModes = new IdentifierSetMultiMap<string>([[ identifier, PERMISSIONS.Read ]]);
    compareMaps(
      await reader.handle({ credentials, requestedModes }),
      new IdentifierMap([[ identifier, { [PERMISSIONS.Read]: true }]]),
    );
    expect(source.handle).toHaveBeenCalledTimes(1);
    expect(source.handle).toHaveBeenLastCalledWith({ credentials, requestedModes });
  });

  it('always returns control permission for owned resources.', async(): Promise<void> => {
    const identifier2 = { path: `${podBaseUrl}foo` };
    requestedModes.add(identifier2, ACL.Control);
    sourceMap.set(identifier2, { [ACL.Control]: false });
    compareMaps(await reader.handle({ credentials, requestedModes }), new IdentifierMap<PermissionMap>([
      [ identifier, { [PERMISSIONS.Read]: true, [ACL.Control]: true }],
      [ identifier2, { [ACL.Control]: true }],
    ]));
  });

  it('does not call the source reader if no requests are left for it.', async(): Promise<void> => {
    requestedModes = new IdentifierSetMultiMap<string>([[ identifier, ACL.Control ]]);
    compareMaps(
      await reader.handle({ credentials, requestedModes }),
      new IdentifierMap([[ identifier, { [ACL.Control]: true }]]),
    );
    expect(source.handle).toHaveBeenCalledTimes(0);
  });

  it('does not add control permissions if there is no WebID.', async(): Promise<void> => {
    delete credentials.agent;
    compareMaps(
      await reader.handle({ credentials, requestedModes }),
      new IdentifierMap([[ identifier, { [PERMISSIONS.Read]: true }]]),
    );
  });

  it('does not add control permissions root storage could be determined.', async(): Promise<void> => {
    storageStrategy.getStorageIdentifier.mockRejectedValueOnce(new Error('no root!'));
    compareMaps(
      await reader.handle({ credentials, requestedModes }),
      new IdentifierMap([[ identifier, { [PERMISSIONS.Read]: true }]]),
    );
  });

  it('does not add control permissions if there is no pod object.', async(): Promise<void> => {
    podStore.findByBaseUrl.mockResolvedValueOnce(undefined);
    compareMaps(
      await reader.handle({ credentials, requestedModes }),
      new IdentifierMap([[ identifier, { [PERMISSIONS.Read]: true }]]),
    );
  });

  it('does not add control permissions if there are no pod owners.', async(): Promise<void> => {
    podStore.getOwners.mockResolvedValueOnce(undefined);
    compareMaps(
      await reader.handle({ credentials, requestedModes }),
      new IdentifierMap([[ identifier, { [PERMISSIONS.Read]: true }]]),
    );
  });

  it('does not add control permissions if the WebID is not linked to the owner account.', async(): Promise<void> => {
    credentials.agent!.webId = 'http://example.com/otherWebId';
    compareMaps(
      await reader.handle({ credentials, requestedModes }),
      new IdentifierMap([[ identifier, { [PERMISSIONS.Read]: true }]]),
    );
  });
});
