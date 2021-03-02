import { PassthroughKeyValueStore } from '../../../../src/identity/storage/PassthroughKeyValueStore';

describe('PassthroughKeyValueStore', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(PassthroughKeyValueStore).toBeDefined();
  });
});
