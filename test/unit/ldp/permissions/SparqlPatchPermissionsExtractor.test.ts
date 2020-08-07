import { Factory } from 'sparqlalgebrajs';
import { Operation } from '../../../../src/ldp/operations/Operation';
import { SparqlPatchPermissionsExtractor } from '../../../../src/ldp/permissions/SparqlPatchPermissionsExtractor';
import { SparqlUpdatePatch } from '../../../../src/ldp/http/SparqlUpdatePatch';
import { UnsupportedHttpError } from '../../../../src/util/errors/UnsupportedHttpError';

describe('A SparqlPatchPermissionsExtractor', (): void => {
  const extractor = new SparqlPatchPermissionsExtractor();
  const factory = new Factory();

  it('can only handle SPARQL DELETE/INSERT PATCH operations.', async(): Promise<void> => {
    const operation = { method: 'PATCH', body: { algebra: factory.createDeleteInsert() }} as unknown as Operation;
    await expect(extractor.canHandle(operation)).resolves.toBeUndefined();
    await expect(extractor.canHandle({ ...operation, method: 'GET' }))
      .rejects.toThrow(new UnsupportedHttpError('Only PATCH operations are supported.'));
    await expect(extractor.canHandle({ ...operation, body: undefined }))
      .rejects.toThrow(new UnsupportedHttpError('PATCH body is required to determine permissions.'));
    await expect(extractor.canHandle({ ...operation, body: {} as SparqlUpdatePatch }))
      .rejects.toThrow(new UnsupportedHttpError('Only SPARQL update PATCHes are supported.'));
    await expect(extractor.canHandle({ ...operation,
      body: { algebra: factory.createMove('DEFAULT', 'DEFAULT') } as unknown as SparqlUpdatePatch }))
      .rejects.toThrow(new UnsupportedHttpError('Only DELETE/INSERT SPARQL update operations are supported.'));
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
