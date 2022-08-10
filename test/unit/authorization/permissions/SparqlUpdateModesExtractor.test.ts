import { Factory } from 'sparqlalgebrajs';
import type { AccessMap } from '../../../../src/authorization/permissions/Permissions';
import { AccessMode } from '../../../../src/authorization/permissions/Permissions';
import { SparqlUpdateModesExtractor } from '../../../../src/authorization/permissions/SparqlUpdateModesExtractor';
import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import type { SparqlUpdatePatch } from '../../../../src/http/representation/SparqlUpdatePatch';
import type { ResourceSet } from '../../../../src/storage/ResourceSet';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { IdentifierSetMultiMap } from '../../../../src/util/map/IdentifierMap';
import { compareMaps } from '../../../util/Util';

describe('A SparqlUpdateModesExtractor', (): void => {
  const target: ResourceIdentifier = { path: 'http://example.com/foo' };
  let patch: SparqlUpdatePatch;
  let operation: Operation;
  let resourceSet: jest.Mocked<ResourceSet>;
  let extractor: SparqlUpdateModesExtractor;
  const factory = new Factory();

  function getMap(modes: AccessMode[], identifier?: ResourceIdentifier): AccessMap {
    return new IdentifierSetMultiMap(
      modes.map((mode): [ResourceIdentifier, AccessMode] => [ identifier ?? target, mode ]),
    );
  }

  beforeEach(async(): Promise<void> => {
    patch = new BasicRepresentation() as SparqlUpdatePatch;

    operation = {
      method: 'PATCH',
      body: patch,
      preferences: {},
      target,
    };

    resourceSet = {
      hasResource: jest.fn().mockResolvedValue(true),
    };
    extractor = new SparqlUpdateModesExtractor(resourceSet);
  });

  it('can only handle (composite) SPARQL DELETE/INSERT operations.', async(): Promise<void> => {
    patch.algebra = factory.createDeleteInsert();
    await expect(extractor.canHandle(operation)).resolves.toBeUndefined();
    (operation.body as SparqlUpdatePatch).algebra = factory.createCompositeUpdate([ factory.createDeleteInsert() ]);
    await expect(extractor.canHandle(operation)).resolves.toBeUndefined();

    let result = extractor.canHandle({ ...operation, body: {} as SparqlUpdatePatch });
    await expect(result).rejects.toThrow(NotImplementedHttpError);
    await expect(result).rejects.toThrow('Cannot determine permissions of non-SPARQL patches.');

    patch.algebra = factory.createMove('DEFAULT', 'DEFAULT');
    result = extractor.canHandle(operation);
    await expect(result).rejects.toThrow(NotImplementedHttpError);
    await expect(result).rejects.toThrow('Can only determine permissions of a PATCH with DELETE/INSERT operations.');
  });

  it('requires nothing for NOP operations.', async(): Promise<void> => {
    patch.algebra = factory.createNop();
    compareMaps(await extractor.handle(operation), getMap([]));
  });

  it('requires append for INSERT operations.', async(): Promise<void> => {
    patch.algebra = factory.createDeleteInsert(undefined, [
      factory.createPattern(factory.createTerm('<s>'), factory.createTerm('<p>'), factory.createTerm('<o>')),
    ]);
    compareMaps(await extractor.handle(operation), getMap([ AccessMode.append ]));
  });

  it('requires create for INSERT operations if the resource does not exist.', async(): Promise<void> => {
    resourceSet.hasResource.mockResolvedValueOnce(false);
    patch.algebra = factory.createDeleteInsert(undefined, [
      factory.createPattern(factory.createTerm('<s>'), factory.createTerm('<p>'), factory.createTerm('<o>')),
    ]);
    compareMaps(await extractor.handle(operation), getMap([ AccessMode.append, AccessMode.create ]));
  });

  it('requires read and write for DELETE operations.', async(): Promise<void> => {
    patch.algebra = factory.createDeleteInsert([
      factory.createPattern(factory.createTerm('<s>'), factory.createTerm('<p>'), factory.createTerm('<o>')),
    ]);
    compareMaps(await extractor.handle(operation), getMap([ AccessMode.read, AccessMode.write ]));
  });

  it('requires read and append for composite operations with an insert and conditions.', async(): Promise<void> => {
    patch.algebra = factory.createCompositeUpdate([
      factory.createDeleteInsert(undefined, [
        factory.createPattern(factory.createTerm('<s>'), factory.createTerm('<p>'), factory.createTerm('<o>')),
      ], factory.createBgp([
        factory.createPattern(factory.createTerm('<s>'), factory.createTerm('<p>'), factory.createTerm('<o>')),
      ])),
    ]);
    compareMaps(await extractor.handle(operation), getMap([ AccessMode.append, AccessMode.read ]));
  });

  it('requires read, write and append for composite operations with a delete and insert.', async(): Promise<void> => {
    patch.algebra = factory.createCompositeUpdate([
      factory.createDeleteInsert(undefined, [
        factory.createPattern(factory.createTerm('<s>'), factory.createTerm('<p>'), factory.createTerm('<o>')),
      ]),
      factory.createDeleteInsert([
        factory.createPattern(factory.createTerm('<s>'), factory.createTerm('<p>'), factory.createTerm('<o>')),
      ]),
    ]);
    compareMaps(await extractor.handle(operation), getMap([ AccessMode.append, AccessMode.read, AccessMode.write ]));
  });
});
