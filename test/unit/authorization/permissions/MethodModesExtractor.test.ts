import { MethodModesExtractor } from '../../../../src/authorization/permissions/MethodModesExtractor';
import type { AccessMap } from '../../../../src/authorization/permissions/Permissions';
import { AccessMode } from '../../../../src/authorization/permissions/Permissions';
import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import type { ResourceSet } from '../../../../src/storage/ResourceSet';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { IdentifierSetMultiMap } from '../../../../src/util/map/IdentifierMap';
import { compareMaps } from '../../../util/Util';

describe('A MethodModesExtractor', (): void => {
  const target: ResourceIdentifier = { path: 'http://example.com/foo' };
  const operation: Operation = {
    method: 'GET',
    target,
    preferences: {},
    body: new BasicRepresentation(),
  };
  let resourceSet: jest.Mocked<ResourceSet>;
  let extractor: MethodModesExtractor;

  function getMap(modes: AccessMode[], identifier?: ResourceIdentifier): AccessMap {
    return new IdentifierSetMultiMap(
      modes.map((mode): [ResourceIdentifier, AccessMode] => [ identifier ?? target, mode ]),
    );
  }

  beforeEach(async(): Promise<void> => {
    resourceSet = {
      hasResource: jest.fn().mockResolvedValue(true),
    };
    extractor = new MethodModesExtractor(resourceSet);
  });

  it('can handle HEAD/GET/POST/PUT/DELETE.', async(): Promise<void> => {
    await expect(extractor.canHandle({ ...operation, method: 'HEAD' })).resolves.toBeUndefined();
    await expect(extractor.canHandle({ ...operation, method: 'GET' })).resolves.toBeUndefined();
    await expect(extractor.canHandle({ ...operation, method: 'POST' })).resolves.toBeUndefined();
    await expect(extractor.canHandle({ ...operation, method: 'PUT' })).resolves.toBeUndefined();
    await expect(extractor.canHandle({ ...operation, method: 'DELETE' })).resolves.toBeUndefined();
    await expect(extractor.canHandle({ ...operation, method: 'PATCH' })).rejects.toThrow(NotImplementedHttpError);
  });

  it('requires read for HEAD operations.', async(): Promise<void> => {
    compareMaps(await extractor.handle({ ...operation, method: 'HEAD' }), getMap([ AccessMode.read ]));
  });

  it('requires read for GET operations.', async(): Promise<void> => {
    compareMaps(await extractor.handle({ ...operation, method: 'GET' }), getMap([ AccessMode.read ]));
  });

  it('requires append for POST operations.', async(): Promise<void> => {
    compareMaps(await extractor.handle({ ...operation, method: 'POST' }), getMap([ AccessMode.append ]));
  });

  it('requires write for PUT operations.', async(): Promise<void> => {
    compareMaps(await extractor.handle({ ...operation, method: 'PUT' }), getMap([ AccessMode.write ]));
  });

  it('requires append/create for PUT operations if the target does not exist.', async(): Promise<void> => {
    resourceSet.hasResource.mockResolvedValueOnce(false);
    compareMaps(
      await extractor.handle({ ...operation, method: 'PUT' }),
      getMap([ AccessMode.append, AccessMode.create ]),
    );
  });

  it('requires delete for DELETE operations.', async(): Promise<void> => {
    compareMaps(await extractor.handle({ ...operation, method: 'DELETE' }), getMap([ AccessMode.delete ]));
  });

  it('also requires read for DELETE operations on containers.', async(): Promise<void> => {
    const identifier = { path: 'http://example.com/foo/' };
    compareMaps(
      await extractor.handle({ ...operation, method: 'DELETE', target: identifier }),
      getMap([ AccessMode.delete, AccessMode.read ], identifier),
    );
  });
});
