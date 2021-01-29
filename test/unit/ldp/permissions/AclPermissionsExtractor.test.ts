import type { AuxiliaryIdentifierStrategy } from '../../../../src/ldp/auxiliary/AuxiliaryIdentifierStrategy';
import { AclPermissionsExtractor } from '../../../../src/ldp/permissions/AclPermissionsExtractor';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('An AclPermissionsExtractor', (): void => {
  let extractor: AclPermissionsExtractor;

  beforeEach(async(): Promise<void> => {
    const aclStrategy = {
      isAuxiliaryIdentifier: (id): boolean => id.path.endsWith('.acl'),
    } as AuxiliaryIdentifierStrategy;
    extractor = new AclPermissionsExtractor(aclStrategy);
  });

  it('can only handle acl files.', async(): Promise<void> => {
    await expect(extractor.canHandle({ target: { path: 'http://test.com/foo' }} as any))
      .rejects.toThrow(NotImplementedHttpError);
    await expect(extractor.canHandle({ target: { path: 'http://test.com/foo.acl' }} as any))
      .resolves.toBeUndefined();
  });

  it('returns control permissions.', async(): Promise<void> => {
    await expect(extractor.handle()).resolves.toEqual({
      read: false,
      write: false,
      append: false,
      control: true,
    });
  });
});
