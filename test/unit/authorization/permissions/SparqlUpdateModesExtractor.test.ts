import { Factory } from 'sparqlalgebrajs';
import { AccessMode } from '../../../../src/authorization/permissions/Permissions';
import { SparqlUpdateModesExtractor } from '../../../../src/authorization/permissions/SparqlUpdateModesExtractor';
import type { Operation } from '../../../../src/http/Operation';
import type { SparqlUpdatePatch } from '../../../../src/http/representation/SparqlUpdatePatch';
import type { ResourceSet } from '../../../../src/storage/ResourceSet';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('A SparqlUpdateModesExtractor', (): void => {
  let resourceSet: jest.Mocked<ResourceSet>;
  let extractor: SparqlUpdateModesExtractor;
  const factory = new Factory();

  beforeEach(async(): Promise<void> => {
    resourceSet = {
      hasResource: jest.fn().mockResolvedValue(true),
    };
    extractor = new SparqlUpdateModesExtractor(resourceSet);
  });

  it('can only handle (composite) SPARQL DELETE/INSERT operations.', async(): Promise<void> => {
    const operation = { method: 'PATCH', body: { algebra: factory.createDeleteInsert() }} as unknown as Operation;
    await expect(extractor.canHandle(operation)).resolves.toBeUndefined();
    (operation.body as SparqlUpdatePatch).algebra = factory.createCompositeUpdate([ factory.createDeleteInsert() ]);
    await expect(extractor.canHandle(operation)).resolves.toBeUndefined();

    let result = extractor.canHandle({ ...operation, body: {} as SparqlUpdatePatch });
    await expect(result).rejects.toThrow(NotImplementedHttpError);
    await expect(result).rejects.toThrow('Cannot determine permissions of non-SPARQL patches.');

    result = extractor.canHandle({ ...operation,
      body: { algebra: factory.createMove('DEFAULT', 'DEFAULT') } as unknown as SparqlUpdatePatch });
    await expect(result).rejects.toThrow(NotImplementedHttpError);
    await expect(result).rejects.toThrow('Can only determine permissions of a PATCH with DELETE/INSERT operations.');
  });

  it('requires nothing for NOP operations.', async(): Promise<void> => {
    const operation = {
      method: 'PATCH',
      body: { algebra: factory.createNop() },
    } as unknown as Operation;
    await expect(extractor.handle(operation)).resolves.toEqual(new Set());
  });

  it('requires append for INSERT operations.', async(): Promise<void> => {
    const operation = {
      method: 'PATCH',
      body: { algebra: factory.createDeleteInsert(undefined, [
        factory.createPattern(factory.createTerm('<s>'), factory.createTerm('<p>'), factory.createTerm('<o>')),
      ]) },
    } as unknown as Operation;
    await expect(extractor.handle(operation)).resolves.toEqual(new Set([ AccessMode.append ]));
  });

  it('requires create for INSERT operations if the resource does not exist.', async(): Promise<void> => {
    resourceSet.hasResource.mockResolvedValueOnce(false);
    const operation = {
      method: 'PATCH',
      body: { algebra: factory.createDeleteInsert(undefined, [
        factory.createPattern(factory.createTerm('<s>'), factory.createTerm('<p>'), factory.createTerm('<o>')),
      ]) },
    } as unknown as Operation;
    await expect(extractor.handle(operation)).resolves.toEqual(new Set([ AccessMode.append, AccessMode.create ]));
  });

  it('requires read and write for DELETE operations.', async(): Promise<void> => {
    const operation = {
      method: 'PATCH',
      body: { algebra: factory.createDeleteInsert([
        factory.createPattern(factory.createTerm('<s>'), factory.createTerm('<p>'), factory.createTerm('<o>')),
      ]) },
    } as unknown as Operation;
    await expect(extractor.handle(operation))
      .resolves.toEqual(new Set([ AccessMode.read, AccessMode.write ]));
  });

  it('requires read and append for composite operations with an insert and conditions.', async(): Promise<void> => {
    const operation = {
      method: 'PATCH',
      body: { algebra: factory.createCompositeUpdate([ factory.createDeleteInsert(undefined, [
        factory.createPattern(factory.createTerm('<s>'), factory.createTerm('<p>'), factory.createTerm('<o>')),
      ], factory.createBgp([
        factory.createPattern(factory.createTerm('<s>'), factory.createTerm('<p>'), factory.createTerm('<o>')),
      ])) ]) },
    } as unknown as Operation;
    await expect(extractor.handle(operation)).resolves.toEqual(new Set([ AccessMode.append, AccessMode.read ]));
  });

  it('requires read, write and append for composite operations with a delete and insert.', async(): Promise<void> => {
    const operation = {
      method: 'PATCH',
      body: { algebra: factory.createCompositeUpdate([ factory.createDeleteInsert(undefined, [
        factory.createPattern(factory.createTerm('<s>'), factory.createTerm('<p>'), factory.createTerm('<o>')),
      ]),
      factory.createDeleteInsert([
        factory.createPattern(factory.createTerm('<s>'), factory.createTerm('<p>'), factory.createTerm('<o>')),
      ]) ]) },
    } as unknown as Operation;
    await expect(extractor.handle(operation))
      .resolves.toEqual(new Set([ AccessMode.append, AccessMode.read, AccessMode.write ]));
  });
});
