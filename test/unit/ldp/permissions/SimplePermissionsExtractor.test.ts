import { Operation } from '../../../../src/ldp/operations/Operation';
import { SimplePermissionsExtractor } from '../../../../src/ldp/permissions/SimplePermissionsExtractor';

describe('A SimplePermissionsExtractor', (): void => {
  const extractor = new SimplePermissionsExtractor();

  it('can handle all input.', async(): Promise<void> => {
    await expect(extractor.canHandle()).resolves.toBeUndefined();
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
