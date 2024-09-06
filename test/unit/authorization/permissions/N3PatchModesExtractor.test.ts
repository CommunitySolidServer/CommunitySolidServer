import { DataFactory } from 'n3';
import type { Quad } from '@rdfjs/types';
import { N3PatchModesExtractor } from '../../../../src/authorization/permissions/N3PatchModesExtractor';
import type { AccessMap } from '../../../../src/authorization/permissions/Permissions';
import { AccessMode } from '../../../../src/authorization/permissions/Permissions';
import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { N3Patch } from '../../../../src/http/representation/N3Patch';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import type { ResourceSet } from '../../../../src/storage/ResourceSet';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { IdentifierSetMultiMap } from '../../../../src/util/map/IdentifierMap';
import { compareMaps } from '../../../util/Util';

const { quad, namedNode } = DataFactory;

describe('An N3PatchModesExtractor', (): void => {
  const target: ResourceIdentifier = { path: 'http://example.com/foo' };
  const triple: Quad = quad(namedNode('a'), namedNode('b'), namedNode('c'));
  let patch: N3Patch;
  let operation: Operation;
  let resourceSet: jest.Mocked<ResourceSet>;
  let extractor: N3PatchModesExtractor;

  function getMap(modes: AccessMode[], identifier?: ResourceIdentifier): AccessMap {
    return new IdentifierSetMultiMap(
      modes.map((mode): [ResourceIdentifier, AccessMode] => [ identifier ?? target, mode ]),
    );
  }

  beforeEach(async(): Promise<void> => {
    patch = new BasicRepresentation() as N3Patch;
    patch.deletes = [];
    patch.inserts = [];
    patch.conditions = [];

    operation = {
      method: 'PATCH',
      body: patch,
      preferences: {},
      target,
    };

    resourceSet = {
      hasResource: jest.fn().mockResolvedValue(true),
    };

    extractor = new N3PatchModesExtractor(resourceSet);
  });

  it('can only handle N3 Patch documents.', async(): Promise<void> => {
    operation.body = new BasicRepresentation();
    await expect(extractor.canHandle(operation)).rejects.toThrow(NotImplementedHttpError);

    operation.body = patch;
    await expect(extractor.canHandle(operation)).resolves.toBeUndefined();
  });

  it('requires read access when there are conditions.', async(): Promise<void> => {
    patch.conditions = [ triple ];
    compareMaps(await extractor.handle(operation), getMap([ AccessMode.read ]));
  });

  it('requires append access when there are inserts.', async(): Promise<void> => {
    patch.inserts = [ triple ];
    compareMaps(await extractor.handle(operation), getMap([ AccessMode.append ]));
  });

  it('requires create access when there are inserts and the resource does not exist.', async(): Promise<void> => {
    resourceSet.hasResource.mockResolvedValueOnce(false);
    patch.inserts = [ triple ];
    compareMaps(await extractor.handle(operation), getMap([ AccessMode.append, AccessMode.create ]));
  });

  it('requires read and write access when there are inserts.', async(): Promise<void> => {
    patch.deletes = [ triple ];
    compareMaps(await extractor.handle(operation), getMap([ AccessMode.read, AccessMode.write ]));
  });

  it('combines required access modes when required.', async(): Promise<void> => {
    patch.conditions = [ triple ];
    patch.inserts = [ triple ];
    patch.deletes = [ triple ];
    compareMaps(await extractor.handle(operation), getMap([ AccessMode.read, AccessMode.append, AccessMode.write ]));
  });
});
