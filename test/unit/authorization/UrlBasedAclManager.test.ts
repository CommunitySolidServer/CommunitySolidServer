import { UrlBasedAclManager } from '../../../src/authorization/UrlBasedAclManager';

describe('An UrlBasedAclManager', (): void => {
  const manager = new UrlBasedAclManager();

  describe('#getAcl', (): void => {
    it('generates acl URLs by adding an .acl extension.', async(): Promise<void> => {
      await expect(manager.getAclDocument({ path: '/foo/bar' })).resolves.toEqual({ path: '/foo/bar.acl' });
    });

    it('returns the identifier if the input is already an acl resource.', async(): Promise<void> => {
      await expect(manager.getAclDocument({ path: '/foo/bar.acl' })).resolves.toEqual({ path: '/foo/bar.acl' });
    });
  });

  describe('#isAcl', (): void => {
    it('checks if a resource is an acl resource by looking at the extension.', async(): Promise<void> => {
      await expect(manager.isAclDocument({ path: '/foo/bar' })).resolves.toBeFalsy();
      await expect(manager.isAclDocument({ path: '/foo/bar/' })).resolves.toBeFalsy();
      await expect(manager.isAclDocument({ path: '/foo/bar.acl' })).resolves.toBeTruthy();
      await expect(manager.isAclDocument({ path: '/foo/bar.acl/' })).resolves.toBeTruthy();
    });
  });

  describe('#getResource', (): void => {
    it('generates non-acl resource URLs by removing the .acl extension.', async(): Promise<void> => {
      await expect(manager.getAclConstrainedResource({ path: '/foo/bar.acl' })).resolves.toEqual({ path: '/foo/bar' });
    });

    it('returns the identifier if the input is already a non-acl resource.', async(): Promise<void> => {
      await expect(manager.getAclConstrainedResource({ path: '/foo/bar' })).resolves.toEqual({ path: '/foo/bar' });
    });
  });
});
