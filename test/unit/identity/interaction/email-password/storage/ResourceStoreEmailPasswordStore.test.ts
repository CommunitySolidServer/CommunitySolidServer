import {
  ResourceStoreEmailPasswordStore,
} from '../../../../../../src/identity/interaction/email-password/storage/ResourceStoreEmailPasswordStore';

describe('ResourceStoreEmailPasswordStore', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(ResourceStoreEmailPasswordStore).toBeDefined();
  });
});
