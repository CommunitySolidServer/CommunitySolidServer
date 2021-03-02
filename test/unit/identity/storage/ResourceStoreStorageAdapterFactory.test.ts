import {
  ResourceStoreStorageAdapterFactory,
} from '../../../../src/identity/storage/ResourceStoreStorageAdapterFactory';

describe('ResourceStoreStorageAdapterFactory', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(ResourceStoreStorageAdapterFactory).toBeDefined();
  });
});
