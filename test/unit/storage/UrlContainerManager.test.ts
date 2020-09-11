import { UrlContainerManager } from '../../../src/storage/UrlContainerManager';

describe('An UrlContainerManager', (): void => {
  it('returns the parent URl for a single call.', async(): Promise<void> => {
    const manager = new UrlContainerManager('http://test.com/foo/');
    await expect(manager.getContainer({ path: 'http://test.com/foo/bar' }))
      .resolves.toEqual({ path: 'http://test.com/foo/' });
    await expect(manager.getContainer({ path: 'http://test.com/foo/bar/' }))
      .resolves.toEqual({ path: 'http://test.com/foo/' });
  });

  it('errors when getting the container of root.', async(): Promise<void> => {
    let manager = new UrlContainerManager('http://test.com/foo/');
    await expect(manager.getContainer({ path: 'http://test.com/foo/' }))
      .rejects.toThrow('Root does not have a container.');
    await expect(manager.getContainer({ path: 'http://test.com/foo' }))
      .rejects.toThrow('Root does not have a container.');

    manager = new UrlContainerManager('http://test.com/foo/');
    await expect(manager.getContainer({ path: 'http://test.com/foo/' }))
      .rejects.toThrow('Root does not have a container.');
    await expect(manager.getContainer({ path: 'http://test.com/foo' }))
      .rejects.toThrow('Root does not have a container.');
  });

  it('errors when the root of an URl is reached that does not match the input root.', async(): Promise<void> => {
    const manager = new UrlContainerManager('http://test.com/foo/');
    await expect(manager.getContainer({ path: 'http://test.com/' }))
      .rejects.toThrow('URL root reached.');
  });
});
