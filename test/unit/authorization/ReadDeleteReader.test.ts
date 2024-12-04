import type { Credentials } from '../../../src/authentication/Credentials';
import type { PermissionReader } from '../../../src/authorization/PermissionReader';
import type { AccessMap } from '../../../src/authorization/permissions/Permissions';
import { AccessMode } from '../../../src/authorization/permissions/Permissions';
import { ReadDeleteReader } from '../../../src/authorization/ReadDeleteReader';
import type { ResourceSet } from '../../../src/storage/ResourceSet';
import type { IdentifierStrategy } from '../../../src/util/identifiers/IdentifierStrategy';
import { IdentifierMap, IdentifierSetMultiMap } from '../../../src/util/map/IdentifierMap';

describe('A ReadDeleteReader', (): void => {
  const baseUrl = 'http://example.com/';
  const resource = 'http://example.com/foo';
  const credentials: Credentials = {};
  const result = new IdentifierMap();
  let requestedModes: AccessMap;
  let source: jest.Mocked<PermissionReader>;
  let resourceSet: jest.Mocked<ResourceSet>;
  let identifierStrategy: jest.Mocked<IdentifierStrategy>;
  let reader: ReadDeleteReader;

  beforeEach(async(): Promise<void> => {
    requestedModes = new IdentifierSetMultiMap();

    source = {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue(result),
    } as any;

    resourceSet = {
      hasResource: jest.fn().mockResolvedValue(true),
    };

    identifierStrategy = {
      isRootContainer: jest.fn().mockReturnValue(false),
      getParentContainer: jest.fn().mockReturnValue({ path: baseUrl }),
    } as any;

    reader = new ReadDeleteReader(source, resourceSet, identifierStrategy);
  });

  it('supports input its source supports.', async(): Promise<void> => {
    await expect(reader.canHandle({ credentials, requestedModes })).resolves.toBeUndefined();

    source.canHandle.mockRejectedValue(new Error('bad data'));
    await expect(reader.canHandle({ credentials, requestedModes })).rejects.toThrow('bad data');
  });

  it('adds read to the requested modes if all conditions are met.', async(): Promise<void> => {
    requestedModes.add({ path: resource }, AccessMode.delete);
    identifierStrategy.isRootContainer.mockReturnValue(false);
    resourceSet.hasResource.mockResolvedValue(false);

    await expect(reader.handle({ credentials, requestedModes })).resolves.toBe(result);
    const newModes = source.handle.mock.calls[0][0].requestedModes;
    expect(newModes.size).toBe(3);
    expect(newModes.get({ path: resource })).toContain(AccessMode.read);
    expect(newModes.get({ path: baseUrl })).toContain(AccessMode.read);
  });

  it('does not change the results if no delete access is required.', async(): Promise<void> => {
    requestedModes.add({ path: resource }, AccessMode.write);
    identifierStrategy.isRootContainer.mockReturnValue(false);
    resourceSet.hasResource.mockResolvedValue(false);

    await expect(reader.handle({ credentials, requestedModes })).resolves.toBe(result);
    const newModes = source.handle.mock.calls[0][0].requestedModes;
    expect(newModes.size).toBe(1);
    expect(newModes.get({ path: resource })).not.toContain(AccessMode.read);
    expect(newModes.get({ path: baseUrl })).toBeUndefined();
  });

  it('does not add parent modes if the target is a root container.', async(): Promise<void> => {
    requestedModes.add({ path: resource }, AccessMode.delete);
    identifierStrategy.isRootContainer.mockReturnValue(true);
    resourceSet.hasResource.mockResolvedValue(false);

    await expect(reader.handle({ credentials, requestedModes })).resolves.toBe(result);
    const newModes = source.handle.mock.calls[0][0].requestedModes;
    expect(newModes.size).toBe(2);
    expect(newModes.get({ path: resource })).toContain(AccessMode.read);
    expect(newModes.get({ path: baseUrl })).toBeUndefined();
  });

  it('does not change the results if the target exists.', async(): Promise<void> => {
    requestedModes.add({ path: resource }, AccessMode.delete);
    identifierStrategy.isRootContainer.mockReturnValue(false);
    resourceSet.hasResource.mockResolvedValue(true);

    await expect(reader.handle({ credentials, requestedModes })).resolves.toBe(result);
    const newModes = source.handle.mock.calls[0][0].requestedModes;
    expect(newModes.size).toBe(1);
    expect(newModes.get({ path: resource })).not.toContain(AccessMode.read);
    expect(newModes.get({ path: baseUrl })).toBeUndefined();
  });
});
