import { Factory } from 'sparqlalgebrajs';
import { SparqlUpdatePatch } from '../../../../src/ldp/http/SparqlUpdatePatch';
import { Operation } from '../../../../src/ldp/operations/Operation';
import { SparqlPatchPermissionsExtractor } from '../../../../src/ldp/permissions/SparqlPatchPermissionsExtractor';
import { UnsupportedHttpError } from '../../../../src/util/errors/UnsupportedHttpError';

describe('A SparqlPatchPermissionsExtractor', (): void => {
  const extractor = new SparqlPatchPermissionsExtractor();
  const factory = new Factory();

  it('can only handle SPARQL DELETE/INSERT PATCH operations.', async(): Promise<void> => {
    const operation = { method: 'PATCH', body: { algebra: factory.createDeleteInsert() }} as unknown as Operation;
    await expect(extractor.canHandle(operation)).resolves.toBeUndefined();
    await expect(extractor.canHandle({ ...operation, method: 'GET' }))
      .rejects.toThrow(new UnsupportedHttpError('Cannot determine permissions of GET, only PATCH.'));
    await expect(extractor.canHandle({ ...operation, body: undefined }))
      .rejects.toThrow(new UnsupportedHttpError('Cannot determine permissions of PATCH operations without a body.'));
    await expect(extractor.canHandle({ ...operation, body: {} as SparqlUpdatePatch }))
      .rejects.toThrow(new UnsupportedHttpError('Cannot determine permissions of non-SPARQL patches.'));
    await expect(extractor.canHandle({ ...operation,
      body: { algebra: factory.createMove('DEFAULT', 'DEFAULT') } as unknown as SparqlUpdatePatch }))
      .rejects.toThrow(new UnsupportedHttpError('Cannot determine permissions of a PATCH without DELETE/INSERT.'));
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
});
