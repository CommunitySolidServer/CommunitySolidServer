import { AssetPathExtractor } from '../../../../../src/init/variables/extractors/AssetPathExtractor';
import { joinFilePath } from '../../../../../src/util/PathUtil';

describe('An AssetPathExtractor', (): void => {
  let resolver: AssetPathExtractor;

  beforeEach(async(): Promise<void> => {
    resolver = new AssetPathExtractor('path');
  });

  it('resolves the asset path.', async(): Promise<void> => {
    await expect(resolver.handle({ path: '/var/data' })).resolves.toBe('/var/data');
  });

  it('errors if the path is not a string.', async(): Promise<void> => {
    await expect(resolver.handle({ path: 1234 })).rejects.toThrow('Invalid path argument');
  });

  it('converts paths containing the module path placeholder.', async(): Promise<void> => {
    await expect(resolver.handle({ path: '@css:config/file.json' }))
      .resolves.toEqual(joinFilePath(__dirname, '../../../../../config/file.json'));
  });

  it('defaults to the given path if none is provided.', async(): Promise<void> => {
    resolver = new AssetPathExtractor('path', '/root');
    await expect(resolver.handle({ otherPath: '/var/data' })).resolves.toBe('/root');
  });

  it('returns null if not default value or default is provided.', async(): Promise<void> => {
    resolver = new AssetPathExtractor('path');
    await expect(resolver.handle({ otherPath: '/var/data' })).resolves.toBeNull();
  });
});
