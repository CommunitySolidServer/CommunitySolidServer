import type { IdentifierGenerator } from '../../../../src/pods/generate/IdentifierGenerator';
import { PodStorageLocationStrategy } from '../../../../src/server/description/PodStorageLocationStrategy';

describe('A PodStorageLocationStrategy', (): void => {
  const generator: IdentifierGenerator = {
    generate: jest.fn(),
    extractPod: jest.fn().mockReturnValue({ path: 'http://example.com/' }),
  };
  const strategy = new PodStorageLocationStrategy(generator);

  it('returns the result of the identifier generator.', async(): Promise<void> => {
    await expect(strategy.getStorageIdentifier({ path: 'http://example.com/whatever' }))
      .resolves.toEqual({ path: 'http://example.com/' });
  });
});
