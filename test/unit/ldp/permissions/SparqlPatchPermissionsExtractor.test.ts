import { Factory } from 'sparqlalgebrajs';
import type { SparqlUpdatePatch } from '../../../../src/ldp/http/SparqlUpdatePatch';
import type { Operation } from '../../../../src/ldp/operations/Operation';
import { SparqlPatchPermissionsExtractor } from '../../../../src/ldp/permissions/SparqlPatchPermissionsExtractor';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('A SparqlPatchPermissionsExtractor', (): void => {
  const extractor = new SparqlPatchPermissionsExtractor();
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

  it('requires append for INSERT operations.', async(): Promise<void> => {
    const operation = {
      method: 'PATCH',
      body: { algebra: factory.createDeleteInsert(undefined, [
        factory.createPattern(factory.createTerm('<s>'), factory.createTerm('<p>'), factory.createTerm('<o>')),
      ]) },
    } as unknown as Operation;
    await expect(extractor.handle(operation)).resolves.toEqual({
      read: false,
      append: true,
      write: false,
      control: false,
    });
  });

  it('requires write for DELETE operations.', async(): Promise<void> => {
    const operation = {
      method: 'PATCH',
      body: { algebra: factory.createDeleteInsert([
        factory.createPattern(factory.createTerm('<s>'), factory.createTerm('<p>'), factory.createTerm('<o>')),
      ]) },
    } as unknown as Operation;
    await expect(extractor.handle(operation)).resolves.toEqual({
      read: false,
      append: true,
      write: true,
      control: false,
    });
  });

  it('requires append for composite operations with an insert.', async(): Promise<void> => {
    const operation = {
      method: 'PATCH',
      body: { algebra: factory.createCompositeUpdate([ factory.createDeleteInsert(undefined, [
        factory.createPattern(factory.createTerm('<s>'), factory.createTerm('<p>'), factory.createTerm('<o>')),
      ]) ]) },
    } as unknown as Operation;
    await expect(extractor.handle(operation)).resolves.toEqual({
      read: false,
      append: true,
      write: false,
      control: false,
    });
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
    await expect(extractor.handle(operation)).resolves.toEqual({
      read: false,
      append: true,
      write: true,
      control: false,
    });
  });
});
