import { CreateModesExtractor } from '../../../../src/authorization/permissions/CreateModesExtractor';
import type { ModesExtractor } from '../../../../src/authorization/permissions/ModesExtractor';
import type { AccessMap } from '../../../../src/authorization/permissions/Permissions';
import { AccessMode } from '../../../../src/authorization/permissions/Permissions';
import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import type { ResourceSet } from '../../../../src/storage/ResourceSet';
import { IdentifierSetMultiMap } from '../../../../src/util/map/IdentifierMap';
import { compareMaps } from '../../../util/Util';

describe('A CreateModesExtractor', (): void => {
  const target: ResourceIdentifier = { path: 'http://example.com/foo' };
  let operation: Operation;
  let result: AccessMap;
  let resourceSet: jest.Mocked<ResourceSet>;
  let source: jest.Mocked<ModesExtractor>;
  let extractor: CreateModesExtractor;

  beforeEach(async(): Promise<void> => {
    operation = {
      method: 'PATCH',
      target,
      body: new BasicRepresentation(),
      preferences: {},
    };

    result = new IdentifierSetMultiMap<AccessMode>([[ target, AccessMode.read ]]);

    resourceSet = {
      hasResource: jest.fn().mockResolvedValue(true),
    };

    source = {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue(result),
    } as any;

    extractor = new CreateModesExtractor(source, resourceSet);
  });

  it('checks if the source can handle the input.', async(): Promise<void> => {
    await expect(extractor.canHandle(operation)).resolves.toBeUndefined();

    source.canHandle.mockRejectedValue(new Error('bad data'));
    await expect(extractor.canHandle(operation)).rejects.toThrow('bad data');
  });

  it('does nothing if the resource exists.', async(): Promise<void> => {
    await expect(extractor.handle(operation)).resolves.toBe(result);
    compareMaps(result, new IdentifierSetMultiMap([[ target, AccessMode.read ]]));
  });

  it('adds the create mode if the resource does not exist.', async(): Promise<void> => {
    resourceSet.hasResource.mockResolvedValue(false);
    await expect(extractor.handle(operation)).resolves.toBe(result);
    compareMaps(result, new IdentifierSetMultiMap([[ target, AccessMode.read ], [ target, AccessMode.create ]]));
  });
});
