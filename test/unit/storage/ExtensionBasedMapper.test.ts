import { ExtensionBasedMapper } from '../../../src/storage/ExtensionBasedMapper';

describe('An ExtensionBasedMapper', (): void => {
  const base = 'http://test.com/';
  const rootFilepath = 'uploads/';
  const resourceMapper = new ExtensionBasedMapper(base, rootFilepath);

  it('returns the correct url of a file.', async(): Promise<void> => {
    let result = resourceMapper.mapFilePathToUrl(`${rootFilepath}test.txt`);
    expect(result).toEqual(`${base}test.txt`);

    result = resourceMapper.mapFilePathToUrl(`${rootFilepath}image.jpg`);
    expect(result).toEqual(`${base}image.jpg`);
  });

  it('errors when filepath does not contain rootFilepath.', async(): Promise<void> => {
    expect((): string => resourceMapper.mapFilePathToUrl('random/test.txt')).toThrow(Error);
    expect((): string => resourceMapper.mapFilePathToUrl('test.txt')).toThrow(Error);
  });
});
