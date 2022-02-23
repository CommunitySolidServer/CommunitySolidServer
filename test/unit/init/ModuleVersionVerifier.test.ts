import { ModuleVersionVerifier } from '../../../src/init/ModuleVersionVerifier';

describe('A ModuleVersionVerifier', (): void => {
  const storageKey = 'uniqueVersionKey';
  let storageMap: Map<string, string>;
  let initializer: ModuleVersionVerifier;

  beforeEach(async(): Promise<void> => {
    storageMap = new Map<string, string>();
    initializer = new ModuleVersionVerifier(storageKey, storageMap as any);
  });

  it('stores the latest version.', async(): Promise<void> => {
    await expect(initializer.handle()).resolves.toBeUndefined();
    expect(storageMap.get(storageKey)).toMatch(/^\d+\.\d+\.\d+(?:-.+)?/u);
  });
});
