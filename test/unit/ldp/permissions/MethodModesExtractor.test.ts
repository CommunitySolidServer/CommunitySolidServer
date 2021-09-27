import type { Operation } from '../../../../src/ldp/operations/Operation';
import { MethodModesExtractor } from '../../../../src/ldp/permissions/MethodModesExtractor';
import { AccessMode } from '../../../../src/ldp/permissions/PermissionSet';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('A MethodModesExtractor', (): void => {
  const extractor = new MethodModesExtractor();

  it('can handle HEAD/GET/POST/PUT/DELETE.', async(): Promise<void> => {
    await expect(extractor.canHandle({ method: 'HEAD' } as Operation)).resolves.toBeUndefined();
    await expect(extractor.canHandle({ method: 'GET' } as Operation)).resolves.toBeUndefined();
    await expect(extractor.canHandle({ method: 'POST' } as Operation)).resolves.toBeUndefined();
    await expect(extractor.canHandle({ method: 'PUT' } as Operation)).resolves.toBeUndefined();
    await expect(extractor.canHandle({ method: 'DELETE' } as Operation)).resolves.toBeUndefined();
    await expect(extractor.canHandle({ method: 'PATCH' } as Operation)).rejects.toThrow(NotImplementedHttpError);
  });

  it('requires read for HEAD operations.', async(): Promise<void> => {
    await expect(extractor.handle({ method: 'HEAD' } as Operation)).resolves.toEqual(new Set([ AccessMode.read ]));
  });

  it('requires read for GET operations.', async(): Promise<void> => {
    await expect(extractor.handle({ method: 'GET' } as Operation)).resolves.toEqual(new Set([ AccessMode.read ]));
  });

  it('requires append for POST operations.', async(): Promise<void> => {
    await expect(extractor.handle({ method: 'POST' } as Operation)).resolves.toEqual(new Set([ AccessMode.append ]));
  });

  it('requires write for PUT operations.', async(): Promise<void> => {
    await expect(extractor.handle({ method: 'PUT' } as Operation))
      .resolves.toEqual(new Set([ AccessMode.append, AccessMode.write ]));
  });

  it('requires write for DELETE operations.', async(): Promise<void> => {
    await expect(extractor.handle({ method: 'DELETE' } as Operation))
      .resolves.toEqual(new Set([ AccessMode.append, AccessMode.write ]));
  });
});
