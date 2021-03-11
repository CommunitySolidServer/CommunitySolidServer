import {
  KeyValueEmailPasswordStore,
} from '../../../../../../src/identity/interaction/email-password/storage/KeyValueEmailPasswordStore';

describe('KeyValueEmailPasswordStore', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(KeyValueEmailPasswordStore).toBeDefined();
  });
});
