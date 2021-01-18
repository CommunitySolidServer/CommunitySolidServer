import { Factory } from 'sparqlalgebrajs';
import type { SparqlUpdatePatch } from '../../../../src/ldp/http/SparqlUpdatePatch';
import type { Operation } from '../../../../src/ldp/operations/Operation';
import { SparqlPatchPermissionsExtractor } from '../../../../src/ldp/permissions/SparqlPatchPermissionsExtractor';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';

describe('A SparqlPatchPermissionsExtractor', (): void => {
  const extractor = new SparqlPatchPermissionsExtractor();
  const factory = new Factory();

  it('can only handle (composite) SPARQL DELETE/INSERT PATCH operations.', async(): Promise<void> => {
    const operation = { method: 'PATCH', body: { algebra: factory.createDeleteInsert() }} as unknown as Operation;
    await expect(extractor.canHandle(operation)).resolves.toBeUndefined();
    (operation.body as SparqlUpdatePatch).algebra = factory.createCompositeUpdate([ factory.createDeleteInsert() ]);
    await expect(extractor.canHandle(operation)).resolves.toBeUndefined();
    await expect(extractor.canHandle({ ...operation, method: 'GET' }))
      .rejects.toThrow(new BadRequestHttpError('Cannot determine permissions of GET, only PATCH.'));
    await expect(extractor.canHandle({ ...operation, body: undefined }))
      .rejects.toThrow(new BadRequestHttpError('Cannot determine permissions of PATCH operations without a body.'));
    await expect(extractor.canHandle({ ...operation, body: {} as SparqlUpdatePatch }))
      .rejects.toThrow(new BadRequestHttpError('Cannot determine permissions of non-SPARQL patches.'));
    await expect(extractor.canHandle({ ...operation,
      body: { algebra: factory.createMove('DEFAULT', 'DEFAULT') } as unknown as SparqlUpdatePatch }))
      .rejects
      .toThrow(new BadRequestHttpError('Can only determine permissions of a PATCH with DELETE/INSERT operations.'));
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
    });
  });
});
