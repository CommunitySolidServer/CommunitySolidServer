import { Operation } from '../../../../src/ldp/operations/Operation';
import { BasePermissionsExtractor } from '../../../../src/ldp/permissions/BasePermissionsExtractor';
import { UnsupportedHttpError } from '../../../../src/util/errors/UnsupportedHttpError';

describe('A BasePermissionsExtractor', (): void => {
  const extractor = new BasePermissionsExtractor();

  it('can handle HEAD/GET/POST/PUT/DELETE.', async(): Promise<void> => {
    await expect(extractor.canHandle({ method: 'HEAD' } as Operation)).resolves.toBeUndefined();
    await expect(extractor.canHandle({ method: 'GET' } as Operation)).resolves.toBeUndefined();
    await expect(extractor.canHandle({ method: 'POST' } as Operation)).resolves.toBeUndefined();
    await expect(extractor.canHandle({ method: 'PUT' } as Operation)).resolves.toBeUndefined();
    await expect(extractor.canHandle({ method: 'DELETE' } as Operation)).resolves.toBeUndefined();
    await expect(extractor.canHandle({ method: 'PATCH' } as Operation)).rejects.toThrow(UnsupportedHttpError);
  });

  it('requires read for HEAD operations.', async(): Promise<void> => {
    await expect(extractor.handle({ method: 'HEAD' } as Operation)).resolves.toEqual({
      read: true,
      append: false,
      write: false,
    });
  });

  it('requires read for GET operations.', async(): Promise<void> => {
    await expect(extractor.handle({ method: 'GET' } as Operation)).resolves.toEqual({
      read: true,
      append: false,
      write: false,
    });
  });

  it('requires write for POST operations.', async(): Promise<void> => {
    await expect(extractor.handle({ method: 'POST' } as Operation)).resolves.toEqual({
      read: false,
      append: true,
      write: true,
    });
  });

  it('requires write for PUT operations.', async(): Promise<void> => {
    await expect(extractor.handle({ method: 'PUT' } as Operation)).resolves.toEqual({
      read: false,
      append: true,
      write: true,
    });
  });

  it('requires write for DELETE operations.', async(): Promise<void> => {
    await expect(extractor.handle({ method: 'DELETE' } as Operation)).resolves.toEqual({
      read: false,
      append: true,
      write: true,
    });
  });
});
