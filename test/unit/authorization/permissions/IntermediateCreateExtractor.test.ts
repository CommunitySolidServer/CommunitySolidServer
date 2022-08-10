import { IntermediateCreateExtractor } from '../../../../src/authorization/permissions/IntermediateCreateExtractor';
import type { ModesExtractor } from '../../../../src/authorization/permissions/ModesExtractor';
import type { AccessMap } from '../../../../src/authorization/permissions/Permissions';
import { AccessMode } from '../../../../src/authorization/permissions/Permissions';
import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { ResourceSet } from '../../../../src/storage/ResourceSet';
import { SingleRootIdentifierStrategy } from '../../../../src/util/identifiers/SingleRootIdentifierStrategy';
import { IdentifierSetMultiMap } from '../../../../src/util/map/IdentifierMap';
import { joinUrl } from '../../../../src/util/PathUtil';
import { compareMaps } from '../../../util/Util';

describe('An IntermediateCreateExtractor', (): void => {
  const baseUrl = 'http://example.com/';
  let operation: Operation;
  const strategy = new SingleRootIdentifierStrategy(baseUrl);
  let resourceSet: jest.Mocked<ResourceSet>;
  let source: jest.Mocked<ModesExtractor>;
  let sourceMap: AccessMap;
  let extractor: IntermediateCreateExtractor;

  beforeEach(async(): Promise<void> => {
    operation = {
      target: { path: joinUrl(baseUrl, 'foo') },
      preferences: {},
      method: 'PUT',
      body: new BasicRepresentation(),
    };

    resourceSet = {
      hasResource: jest.fn().mockResolvedValue(true),
    };

    sourceMap = new IdentifierSetMultiMap();
    source = {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue(sourceMap),
    } as any;

    extractor = new IntermediateCreateExtractor(resourceSet, strategy, source);
  });

  it('can handle everything its source can handle.', async(): Promise<void> => {
    await expect(extractor.canHandle(operation)).resolves.toBeUndefined();
    expect(source.canHandle).toHaveBeenCalledTimes(1);
    expect(source.canHandle).toHaveBeenLastCalledWith(operation);

    jest.resetAllMocks();
    source.canHandle.mockRejectedValueOnce(new Error('bad input'));
    await expect(extractor.canHandle(operation)).rejects.toThrow('bad input');
    expect(source.canHandle).toHaveBeenCalledTimes(1);
    expect(source.canHandle).toHaveBeenLastCalledWith(operation);
  });

  it('returns the source output if no create permissions are needed.', async(): Promise<void> => {
    const identifier = { path: joinUrl(baseUrl, 'foo') };
    sourceMap.set(identifier, new Set([ AccessMode.read ]));

    const resultMap = new IdentifierSetMultiMap([[ identifier, AccessMode.read ]]);

    compareMaps(await extractor.handle(operation), resultMap);
    expect(resourceSet.hasResource).toHaveBeenCalledTimes(0);
  });

  it('requests create permissions for all parent containers that do not exist.', async(): Promise<void> => {
    const idA = { path: joinUrl(baseUrl, 'a/') };
    const idAB = { path: joinUrl(baseUrl, 'a/b/') };
    const idABC = { path: joinUrl(baseUrl, 'a/b/c/') };
    const idD = { path: joinUrl(baseUrl, 'd/') };
    const idDE = { path: joinUrl(baseUrl, 'd/e/') };

    sourceMap.set(idABC, new Set([ AccessMode.create, AccessMode.write ]));
    sourceMap.set(idDE, new Set([ AccessMode.create, AccessMode.append ]));
    sourceMap.set(idD, new Set([ AccessMode.read ]));

    resourceSet.hasResource.mockImplementation(async(id): Promise<boolean> => id.path === baseUrl);

    const resultMap = new IdentifierSetMultiMap([
      [ idA, AccessMode.create ],
      [ idAB, AccessMode.create ],
      [ idABC, AccessMode.create ],
      [ idABC, AccessMode.write ],
      [ idD, AccessMode.create ],
      [ idD, AccessMode.read ],
      [ idDE, AccessMode.create ],
      [ idDE, AccessMode.append ],
    ]);

    compareMaps(await extractor.handle(operation), resultMap);
  });
});
