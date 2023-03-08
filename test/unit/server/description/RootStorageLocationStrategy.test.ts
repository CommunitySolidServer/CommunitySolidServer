import { RootStorageLocationStrategy } from '../../../../src/server/description/RootStorageLocationStrategy';

describe('A RootStorageLocationStrategy', (): void => {
  const baseUrl = 'http://example.com/';
  const strategy = new RootStorageLocationStrategy(baseUrl);

  it('returns the base URL.', async(): Promise<void> => {
    await expect(strategy.getStorageIdentifier()).resolves.toEqual({ path: baseUrl });
  });
});
