import { MethodModesExtractor } from '../../../../src/authorization/permissions/MethodModesExtractor';
import { AccessMode } from '../../../../src/authorization/permissions/Permissions';
import type { Operation } from '../../../../src/http/Operation';
import type { ResourceSet } from '../../../../src/storage/ResourceSet';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('A MethodModesExtractor', (): void => {
  let resourceSet: jest.Mocked<ResourceSet>;
  let extractor: MethodModesExtractor;

  beforeEach(async(): Promise<void> => {
    resourceSet = {
      hasResource: jest.fn().mockResolvedValue(true),
    };
    extractor = new MethodModesExtractor(resourceSet);
  });

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
      .resolves.toEqual(new Set([ AccessMode.write ]));
  });

  it('requires create for PUT operations if the target does not exist.', async(): Promise<void> => {
    resourceSet.hasResource.mockResolvedValueOnce(false);
    await expect(extractor.handle({ method: 'PUT' } as Operation))
      .resolves.toEqual(new Set([ AccessMode.write, AccessMode.create ]));
  });

  it('requires delete for DELETE operations.', async(): Promise<void> => {
    await expect(extractor.handle({ method: 'DELETE', target: { path: 'http://example.com/foo' }} as Operation))
      .resolves.toEqual(new Set([ AccessMode.delete ]));
  });

  it('also requires read for DELETE operations on containers.', async(): Promise<void> => {
    await expect(extractor.handle({ method: 'DELETE', target: { path: 'http://example.com/foo/' }} as Operation))
      .resolves.toEqual(new Set([ AccessMode.delete, AccessMode.read ]));
  });
});
