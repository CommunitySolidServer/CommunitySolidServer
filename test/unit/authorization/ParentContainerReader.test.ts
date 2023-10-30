import type { Credentials } from '../../../src/authentication/Credentials';
import { ParentContainerReader } from '../../../src/authorization/ParentContainerReader';
import type { PermissionReader } from '../../../src/authorization/PermissionReader';
import type { AccessMap, PermissionMap } from '../../../src/authorization/permissions/Permissions';
import { AccessMode } from '../../../src/authorization/permissions/Permissions';
import { SingleRootIdentifierStrategy } from '../../../src/util/identifiers/SingleRootIdentifierStrategy';
import { IdentifierMap, IdentifierSetMultiMap } from '../../../src/util/map/IdentifierMap';
import { joinUrl } from '../../../src/util/PathUtil';
import { compareMaps } from '../../util/Util';

describe('A ParentContainerReader', (): void => {
  const baseUrl = 'http://example.com/';
  const parent1 = { path: joinUrl(baseUrl, 'foo/') };
  const target1 = { path: joinUrl(parent1.path, 'foo') };
  const parent2 = { path: joinUrl(baseUrl, 'bar/') };
  const target2 = { path: joinUrl(parent2.path, 'bar') };
  const parent3 = { path: joinUrl(baseUrl, 'baz/') };
  const target3 = { path: joinUrl(parent3.path, 'baz') };
  const credentials: Credentials = {};
  let requestedModes: AccessMap;
  let sourceResult: PermissionMap;
  const identifierStrategy = new SingleRootIdentifierStrategy(baseUrl);
  let source: jest.Mocked<PermissionReader>;
  let reader: ParentContainerReader;

  beforeEach(async(): Promise<void> => {
    requestedModes = new IdentifierSetMultiMap();

    sourceResult = new IdentifierMap([[{ path: joinUrl(baseUrl, 'test') }, { read: true }]]);

    source = { handleSafe: jest.fn().mockResolvedValue(sourceResult) } as any;
    reader = new ParentContainerReader(source, identifierStrategy);
  });

  it('requires parent append permissions to create resources.', async(): Promise<void> => {
    requestedModes.set(target1, new Set([ AccessMode.create ]));
    requestedModes.set(target2, new Set([ AccessMode.create ]));
    sourceResult.set(parent1, { append: true });

    const result = await reader.handle({ requestedModes, credentials });
    expect(result.get(target1)).toEqual({ create: true });
    expect(result.get(target2)).toEqual({});

    const updatedMap = new IdentifierSetMultiMap(requestedModes);
    updatedMap.set(parent1, AccessMode.append);
    updatedMap.set(parent2, AccessMode.append);
    expect(source.handleSafe).toHaveBeenCalledTimes(1);
    expect(source.handleSafe.mock.calls[0][0].credentials).toBe(credentials);
    compareMaps(source.handleSafe.mock.calls[0][0].requestedModes, updatedMap);
    expect(source.handleSafe.mock.calls[0][0].requestedModes).not.toEqual(requestedModes);
  });

  it('requires write and parent write permissions to delete resources.', async(): Promise<void> => {
    requestedModes.set(target1, new Set([ AccessMode.delete ]));
    requestedModes.set(target2, new Set([ AccessMode.delete ]));
    requestedModes.set(target3, new Set([ AccessMode.delete ]));
    sourceResult.set(parent1, { write: true });
    sourceResult.set(parent2, { write: true });
    sourceResult.set(target1, { write: true });
    sourceResult.set(target3, { write: true });

    const result = await reader.handle({ requestedModes, credentials });
    expect(result.get(target1)).toEqual({ delete: true, write: true });
    expect(result.get(target2)).toEqual({});
    expect(result.get(target3)).toEqual({ write: true });

    const updatedMap = new IdentifierSetMultiMap(requestedModes);
    updatedMap.set(parent1, AccessMode.write);
    updatedMap.set(parent2, AccessMode.write);
    updatedMap.set(parent3, AccessMode.write);
    expect(source.handleSafe).toHaveBeenCalledTimes(1);
    expect(source.handleSafe.mock.calls[0][0].credentials).toBe(credentials);
    compareMaps(source.handleSafe.mock.calls[0][0].requestedModes, updatedMap);
  });

  it('does not allow create/delete if the source explicitly forbids it.', async(): Promise<void> => {
    requestedModes.set(target1, new Set([ AccessMode.create, AccessMode.delete ]));
    requestedModes.set(target2, new Set([ AccessMode.create, AccessMode.delete ]));
    sourceResult.set(parent1, { write: true, append: true });
    sourceResult.set(parent2, { write: true, append: true });
    sourceResult.set(target1, { write: true });
    sourceResult.set(target2, { write: true, create: false, delete: false });

    const result = await reader.handle({ requestedModes, credentials });
    expect(result.get(target1)).toEqual({ write: true, create: true, delete: true });
    expect(result.get(target2)).toEqual({ write: true, create: false, delete: false });

    const updatedMap = new IdentifierSetMultiMap(requestedModes);
    updatedMap.set(parent1, new Set([ AccessMode.write, AccessMode.append ]));
    updatedMap.set(parent2, new Set([ AccessMode.write, AccessMode.append ]));
    expect(source.handleSafe).toHaveBeenCalledTimes(1);
    expect(source.handleSafe.mock.calls[0][0].credentials).toBe(credentials);
    compareMaps(source.handleSafe.mock.calls[0][0].requestedModes, updatedMap);
  });

  it('combines the modes with the parent resource if it is also being requested.', async(): Promise<void> => {
    requestedModes.set(target1, AccessMode.create);
    requestedModes.set(parent1, AccessMode.write);
    sourceResult.set(parent1, { write: true, append: true });
    sourceResult.set(target1, { write: true });

    const result = await reader.handle({ requestedModes, credentials });
    expect(result.get(target1)).toEqual({ write: true, create: true, delete: true });
    expect(result.get(parent1)).toEqual({ write: true, append: true });

    const updatedMap = new IdentifierSetMultiMap(requestedModes);
    updatedMap.set(parent1, new Set([ AccessMode.write, AccessMode.append ]));
    expect(source.handleSafe).toHaveBeenCalledTimes(1);
    expect(source.handleSafe.mock.calls[0][0].credentials).toBe(credentials);
    compareMaps(source.handleSafe.mock.calls[0][0].requestedModes, updatedMap);
    expect(source.handleSafe.mock.calls[0][0].requestedModes.get(parent1))
      .toEqual(new Set([ AccessMode.write, AccessMode.append ]));
  });
});
