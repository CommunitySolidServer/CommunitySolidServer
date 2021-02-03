import type { KeyValueStorage } from '../../../../src/storage/keyvalue/KeyValueStorage';
import { ResourceIdentifierStorage } from '../../../../src/storage/keyvalue/ResourceIdentifierStorage';

describe('A ResourceIdentifierStorage', (): void => {
  const path = 'http://test.com/foo';
  const identifier = { path };
  let source: KeyValueStorage<string, number>;
  let storage: ResourceIdentifierStorage<number>;

  beforeEach(async(): Promise<void> => {
    source = {
      get: jest.fn(),
      has: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };
    storage = new ResourceIdentifierStorage(source);
  });

  it('calls the corresponding function on the source Storage.', async(): Promise<void> => {
    await storage.get(identifier);
    expect(source.get).toHaveBeenCalledTimes(1);
    expect(source.get).toHaveBeenLastCalledWith(path);

    await storage.has(identifier);
    expect(source.has).toHaveBeenCalledTimes(1);
    expect(source.has).toHaveBeenLastCalledWith(path);

    await storage.set(identifier, 5);
    expect(source.set).toHaveBeenCalledTimes(1);
    expect(source.set).toHaveBeenLastCalledWith(path, 5);

    await storage.delete(identifier);
    expect(source.delete).toHaveBeenCalledTimes(1);
    expect(source.delete).toHaveBeenLastCalledWith(path);
  });
});
