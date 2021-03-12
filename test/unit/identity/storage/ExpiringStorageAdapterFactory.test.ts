import {
  ExpiringStorageAdapterFactory,
} from '../../../../src/identity/storage/ExpiringStorageAdapterFactory';

describe('ExpiringStorageAdapterFactory', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(ExpiringStorageAdapterFactory).toBeDefined();
  });
});
