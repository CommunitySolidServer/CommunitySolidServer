import { RuntimeConfig } from '../../../src/init/RuntimeConfig';
import { ExtensionBasedMapper } from '../../../src/storage/ExtensionBasedMapper';

describe('A ExtensionBasedMapper', (): void => {
  const base = 'http://test.com/';
  const rootFilepath = 'uploads/';
  const resourceMapper = new ExtensionBasedMapper(new RuntimeConfig({ base, rootFilepath }));

  it('Returns correct url.', async(): Promise<void> => {
    const result = resourceMapper.mapFilePathToUrl('uploads/test.txt');
    expect(result).toEqual(`${base}test.txt`);
  });

  it('Errors when filepath does not contain rootFilepath.', async(): Promise<void> => {
    expect((): string => resourceMapper.mapFilePathToUrl('random/test.txt')).toThrow(Error);
    expect((): string => resourceMapper.mapFilePathToUrl('test.txt')).toThrow(Error);
  });
});
