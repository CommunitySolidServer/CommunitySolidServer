import { DeleteParentExtractor } from '../../../../src/authorization/permissions/DeleteParentExtractor';
import type { ModesExtractor } from '../../../../src/authorization/permissions/ModesExtractor';
import type { AccessMap } from '../../../../src/authorization/permissions/Permissions';
import { AccessMode } from '../../../../src/authorization/permissions/Permissions';
import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { ResourceSet } from '../../../../src/storage/ResourceSet';
import type { IdentifierStrategy } from '../../../../src/util/identifiers/IdentifierStrategy';
import { IdentifierSetMultiMap } from '../../../../src/util/map/IdentifierMap';

describe('A DeleteParentExtractor', (): void => {
  const baseUrl = 'http://example.com/';
  const resource = 'http://example.com/foo';
  let operation: Operation;
  let sourceMap: AccessMap;
  let source: jest.Mocked<ModesExtractor>;
  let resourceSet: jest.Mocked<ResourceSet>;
  let identifierStrategy: jest.Mocked<IdentifierStrategy>;
  let extractor: DeleteParentExtractor;

  beforeEach(async(): Promise<void> => {
    operation = {
      target: { path: resource },
      method: 'DELETE',
      preferences: {},
      body: new BasicRepresentation(),
    };

    sourceMap = new IdentifierSetMultiMap();

    source = {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue(sourceMap),
    } as any;

    resourceSet = {
      hasResource: jest.fn().mockResolvedValue(true),
    };

    identifierStrategy = {
      isRootContainer: jest.fn().mockReturnValue(false),
      getParentContainer: jest.fn().mockReturnValue({ path: baseUrl }),
    } as any;

    extractor = new DeleteParentExtractor(source, resourceSet, identifierStrategy);
  });

  it('supports input its source supports.', async(): Promise<void> => {
    await expect(extractor.canHandle(operation)).resolves.toBeUndefined();

    source.canHandle.mockRejectedValue(new Error('bad data'));
    await expect(extractor.canHandle(operation)).rejects.toThrow('bad data');
  });

  it('adds read permission requirements if all conditions are met.', async(): Promise<void> => {
    sourceMap.add({ path: resource }, AccessMode.delete);
    identifierStrategy.isRootContainer.mockReturnValue(false);
    resourceSet.hasResource.mockResolvedValue(false);

    const resultMap = await extractor.handle(operation);
    expect([ ...resultMap.entries() ]).toHaveLength(2);
    expect(resultMap.get({ path: baseUrl })).toContain(AccessMode.read);
  });

  it('does not change the results if no delete access is required.', async(): Promise<void> => {
    sourceMap.add({ path: resource }, AccessMode.read);
    identifierStrategy.isRootContainer.mockReturnValue(false);
    resourceSet.hasResource.mockResolvedValue(false);

    const resultMap = await extractor.handle(operation);
    expect([ ...resultMap.entries() ]).toHaveLength(1);
    expect(resultMap.get({ path: baseUrl })).toBeUndefined();
  });

  it('does not change the results if the target is the root container.', async(): Promise<void> => {
    sourceMap.add({ path: resource }, AccessMode.delete);
    identifierStrategy.isRootContainer.mockReturnValue(true);
    resourceSet.hasResource.mockResolvedValue(false);

    const resultMap = await extractor.handle(operation);
    expect([ ...resultMap.entries() ]).toHaveLength(1);
    expect(resultMap.get({ path: baseUrl })).toBeUndefined();
  });

  it('does not change the results if the target exists.', async(): Promise<void> => {
    sourceMap.add({ path: resource }, AccessMode.delete);
    identifierStrategy.isRootContainer.mockReturnValue(false);
    resourceSet.hasResource.mockResolvedValue(true);

    const resultMap = await extractor.handle(operation);
    expect([ ...resultMap.entries() ]).toHaveLength(1);
    expect(resultMap.get({ path: baseUrl })).toBeUndefined();
  });
});
