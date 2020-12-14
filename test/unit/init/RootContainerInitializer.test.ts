import { RootContainerInitializer } from '../../../src/init/RootContainerInitializer';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';

describe('A RootContainerInitializer', (): void => {
  const baseUrl = 'http://test.com/';
  const store: jest.Mocked<ResourceStore> = {
    getRepresentation: jest.fn().mockRejectedValue(new NotFoundHttpError()),
    setRepresentation: jest.fn(),
  } as any;
  const initializer = new RootContainerInitializer(baseUrl, store);

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it('invokes ResourceStore initialization.', async(): Promise<void> => {
    await initializer.handle();

    expect(store.getRepresentation).toHaveBeenCalledTimes(1);
    expect(store.getRepresentation).toHaveBeenCalledWith({ path: baseUrl }, {});
    expect(store.setRepresentation).toHaveBeenCalledTimes(1);
  });

  it('does not invoke ResourceStore initialization when a root container already exists.', async(): Promise<void> => {
    store.getRepresentation.mockReturnValueOnce(Promise.resolve({
      data: { destroy: jest.fn() },
    } as any));

    await initializer.handle();

    expect(store.getRepresentation).toHaveBeenCalledTimes(1);
    expect(store.getRepresentation).toHaveBeenCalledWith({ path: 'http://test.com/' }, {});
    expect(store.setRepresentation).toHaveBeenCalledTimes(0);
  });

  it('errors when the store errors writing the root container.', async(): Promise<void> => {
    store.getRepresentation.mockRejectedValueOnce(new Error('Fatal'));
    await expect(initializer.handle()).rejects.toThrow('Fatal');
  });
});
