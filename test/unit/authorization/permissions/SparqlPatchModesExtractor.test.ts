import { Factory } from 'sparqlalgebrajs';
import { AccessMode } from '../../../../src/authorization/permissions/Permissions';
import { SparqlPatchModesExtractor } from '../../../../src/authorization/permissions/SparqlPatchModesExtractor';
import type { Operation } from '../../../../src/http/Operation';
import type { SparqlUpdatePatch } from '../../../../src/http/representation/SparqlUpdatePatch';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('A SparqlPatchModesExtractor', (): void => {
  const extractor = new SparqlPatchModesExtractor();
  const factory = new Factory();

  it('can only handle (composite) SPARQL DELETE/INSERT PATCH operations.', async(): Promise<void> => {
    const operation = { method: 'PATCH', body: { algebra: factory.createDeleteInsert() }} as unknown as Operation;
    await expect(extractor.canHandle(operation)).resolves.toBeUndefined();
    (operation.body as SparqlUpdatePatch).algebra = factory.createCompositeUpdate([ factory.createDeleteInsert() ]);
    await expect(extractor.canHandle(operation)).resolves.toBeUndefined();

    let result = extractor.canHandle({ ...operation, method: 'GET' });
    await expect(result).rejects.toThrow(NotImplementedHttpError);
    await expect(result).rejects.toThrow('Cannot determine permissions of GET, only PATCH.');

    result = extractor.canHandle({ ...operation, body: undefined });
    await expect(result).rejects.toThrow(NotImplementedHttpError);
    await expect(result).rejects.toThrow('Cannot determine permissions of PATCH operations without a body.');

    result = extractor.canHandle({ ...operation, body: {} as SparqlUpdatePatch });
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

  it('requires write for DELETE operations.', async(): Promise<void> => {
    const operation = {
      method: 'PATCH',
      body: { algebra: factory.createDeleteInsert([
        factory.createPattern(factory.createTerm('<s>'), factory.createTerm('<p>'), factory.createTerm('<o>')),
      ]) },
    } as unknown as Operation;
    await expect(extractor.handle(operation))
      .resolves.toEqual(new Set([ AccessMode.append, AccessMode.write, AccessMode.create, AccessMode.delete ]));
  });

  it('requires append for composite operations with an insert.', async(): Promise<void> => {
    const operation = {
      method: 'PATCH',
      body: { algebra: factory.createCompositeUpdate([ factory.createDeleteInsert(undefined, [
        factory.createPattern(factory.createTerm('<s>'), factory.createTerm('<p>'), factory.createTerm('<o>')),
      ]) ]) },
    } as unknown as Operation;
    await expect(extractor.handle(operation)).resolves.toEqual(new Set([ AccessMode.append ]));
  });

  it('requires write for composite operations with a delete.', async(): Promise<void> => {
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
      .resolves.toEqual(new Set([ AccessMode.append, AccessMode.write, AccessMode.create, AccessMode.delete ]));
  });
});
