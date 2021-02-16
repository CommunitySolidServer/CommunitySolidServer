import {
  EmailPasswordResourceStoreStorageAdapter,
} from '../../../../../../src/identity/interaction/email-password/storage/EmailPasswordResourceStoreStorageAdapter';

describe('EmailPasswordResourceStoreStorageAdapter', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(EmailPasswordResourceStoreStorageAdapter).toBeDefined();
  });
});
