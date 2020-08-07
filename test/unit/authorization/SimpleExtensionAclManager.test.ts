import { SimpleExtensionAclManager } from '../../../src/authorization/SimpleExtensionAclManager';

describe('A SimpleExtensionAclManager', (): void => {
  const manager = new SimpleExtensionAclManager();

  it('generates acl URLs by adding an .acl extension.', async(): Promise<void> => {
    await expect(manager.getAcl({ path: '/foo/bar' })).resolves.toEqual({ path: '/foo/bar.acl' });
  });

  it('returns the identifier if the input is already an acl file.', async(): Promise<void> => {
    await expect(manager.getAcl({ path: '/foo/bar.acl' })).resolves.toEqual({ path: '/foo/bar.acl' });
  });

  it('checks if a resource is an acl file by looking at the extension.', async(): Promise<void> => {
    await expect(manager.isAcl({ path: '/foo/bar' })).resolves.toBeFalsy();
    await expect(manager.isAcl({ path: '/foo/bar/' })).resolves.toBeFalsy();
    await expect(manager.isAcl({ path: '/foo/bar.acl' })).resolves.toBeTruthy();
    await expect(manager.isAcl({ path: '/foo/bar.acl/' })).resolves.toBeTruthy();
  });
});
