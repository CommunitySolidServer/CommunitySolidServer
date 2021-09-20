import type { AuxiliaryIdentifierStrategy } from '../../../../src/ldp/auxiliary/AuxiliaryIdentifierStrategy';
import { AclModesExtractor } from '../../../../src/ldp/permissions/AclModesExtractor';
import { AccessMode } from '../../../../src/ldp/permissions/Permissions';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('An AclModesExtractor', (): void => {
  let extractor: AclModesExtractor;

  beforeEach(async(): Promise<void> => {
    const aclStrategy = {
      isAuxiliaryIdentifier: (id): boolean => id.path.endsWith('.acl'),
    } as AuxiliaryIdentifierStrategy;
    extractor = new AclModesExtractor(aclStrategy);
  });

  it('can only handle acl files.', async(): Promise<void> => {
    await expect(extractor.canHandle({ target: { path: 'http://test.com/foo' }} as any))
      .rejects.toThrow(NotImplementedHttpError);
    await expect(extractor.canHandle({ target: { path: 'http://test.com/foo.acl' }} as any))
      .resolves.toBeUndefined();
  });

  it('returns control permissions.', async(): Promise<void> => {
    await expect(extractor.handle()).resolves.toEqual(new Set([ AccessMode.control ]));
  });
});
