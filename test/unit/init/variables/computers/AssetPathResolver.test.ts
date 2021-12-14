import { AssetPathResolver } from '../../../../../src/init/variables/computers/AssetPathResolver';
import { joinFilePath } from '../../../../../src/util/PathUtil';

describe('An AssetPathResolver', (): void => {
  let resolver: AssetPathResolver;

  beforeEach(async(): Promise<void> => {
    resolver = new AssetPathResolver('path');
  });

  it('resolves the asset path.', async(): Promise<void> => {
    await expect(resolver.handle({ path: '/var/data' })).resolves.toEqual('/var/data');
  });

  it('errors if the path is not a string.', async(): Promise<void> => {
    await expect(resolver.handle({ path: 1234 })).rejects.toThrow('Invalid path argument');
  });

  it('converts paths containing the module path placeholder.', async(): Promise<void> => {
    await expect(resolver.handle({ path: '@css:config/file.json' }))
      .resolves.toEqual(joinFilePath(__dirname, '../../../../../config/file.json'));
  });

  it('defaults to the given path if none is provided.', async(): Promise<void> => {
    resolver = new AssetPathResolver('path', '/root');
    await expect(resolver.handle({ otherPath: '/var/data' })).resolves.toEqual('/root');
  });
});
