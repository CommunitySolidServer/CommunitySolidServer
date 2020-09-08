import { RuntimeConfig } from '../../../src/init/RuntimeConfig';
import { FileResourceMapper } from '../../../src/storage/FileResourceMapper';

describe('A FileResourceMapper', (): void => {
  const base = 'http://test.com/';
  const rootFilepath = 'uploads/';
  const resourceMapper = new FileResourceMapper(new RuntimeConfig({ base, rootFilepath }));

  it('can return correct.', async(): Promise<void> => {
    const result = resourceMapper.mapFilePathToUrl('uploads/test.txt');
    expect(result).toEqual(`${base}test.txt`);
  });

  it('errors when filepath does not contain rootFilepath.', async(): Promise<void> => {
    expect((): string => resourceMapper.mapFilePathToUrl('random/test.txt')).toThrow(Error);
    expect((): string => resourceMapper.mapFilePathToUrl('test.txt')).toThrow(Error);
  });
});
