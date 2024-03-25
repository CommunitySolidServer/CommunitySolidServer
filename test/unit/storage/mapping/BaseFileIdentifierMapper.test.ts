import { BaseFileIdentifierMapper } from '../../../../src/storage/mapping/BaseFileIdentifierMapper';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';
import { trimTrailingSlashes } from '../../../../src/util/PathUtil';

jest.mock('node:fs');

describe('An BaseFileIdentifierMapper', (): void => {
  const base = 'http://test.com/';
  const rootFilepath = 'uploads/';
  const mapper = new BaseFileIdentifierMapper(base, rootFilepath);

  describe('mapUrlToFilePath', (): void => {
    it('throws 404 if the input path does not contain the base.', async(): Promise<void> => {
      await expect(mapper.mapUrlToFilePath({ path: 'invalid' }, false)).rejects.toThrow(NotFoundHttpError);
    });

    it('throws 404 if the relative path does not start with a slash.', async(): Promise<void> => {
      const result = mapper.mapUrlToFilePath({ path: `${trimTrailingSlashes(base)}test` }, false);
      await expect(result).rejects.toThrow(BadRequestHttpError);
      await expect(result).rejects.toThrow('URL needs a / after the base');
    });

    it('throws 400 if the input path contains relative parts.', async(): Promise<void> => {
      let result = mapper.mapUrlToFilePath({ path: `${base}test/../test2` }, false);
      await expect(result).rejects.toThrow(BadRequestHttpError);
      await expect(result).rejects.toThrow('Disallowed /../ segment in URL');

      result = mapper.mapUrlToFilePath({ path: `${base}test/..` }, false);
      await expect(result).rejects.toThrow(BadRequestHttpError);
      await expect(result).rejects.toThrow('Disallowed /../ segment in URL');
    });

    it('returns the corresponding file path for container identifiers.', async(): Promise<void> => {
      await expect(mapper.mapUrlToFilePath({ path: `${base}container/` }, false)).resolves.toEqual({
        identifier: { path: `${base}container/` },
        filePath: `${rootFilepath}container/`,
        isMetadata: false,
      });
    });

    it('returns the default content-type.', async(): Promise<void> => {
      await expect(mapper.mapUrlToFilePath({ path: `${base}test` }, false)).resolves.toEqual({
        identifier: { path: `${base}test` },
        filePath: `${rootFilepath}test`,
        contentType: 'application/octet-stream',
        isMetadata: false,
      });
      await expect(mapper.mapUrlToFilePath({ path: `${base}test.ttl` }, false)).resolves.toEqual({
        identifier: { path: `${base}test.ttl` },
        filePath: `${rootFilepath}test.ttl`,
        contentType: 'application/octet-stream',
        isMetadata: false,
      });
      await expect(mapper.mapUrlToFilePath({ path: `${base}test.txt` }, false)).resolves.toEqual({
        identifier: { path: `${base}test.txt` },
        filePath: `${rootFilepath}test.txt`,
        contentType: 'application/octet-stream',
        isMetadata: false,
      });
    });

    it('generates a file path if supported content-type was provided.', async(): Promise<void> => {
      await expect(mapper.mapUrlToFilePath({ path: `${base}test.ttl` }, false, 'text/turtle')).resolves.toEqual({
        identifier: { path: `${base}test.ttl` },
        filePath: `${rootFilepath}test.ttl`,
        contentType: 'text/turtle',
        isMetadata: false,
      });
    });

    it('returns the corresponding file path for metadata identifiers.', async(): Promise<void> => {
      await expect(mapper.mapUrlToFilePath({ path: `${base}test.meta` }, false, 'text/turtle')).resolves.toEqual({
        identifier: { path: `${base}test.meta` },
        filePath: `${rootFilepath}test.meta`,
        contentType: 'text/turtle',
        isMetadata: true,
      });
    });

    it('generates correct metadata file paths.', async(): Promise<void> => {
      await expect(mapper.mapUrlToFilePath({ path: `${base}test.txt` }, true)).resolves.toEqual({
        identifier: { path: `${base}test.txt` },
        filePath: `${rootFilepath}test.txt.meta`,
        contentType: 'application/octet-stream',
        isMetadata: true,
      });
    });
  });

  describe('mapFilePathToUrl', (): void => {
    it('throws an error if the input path does not contain the root file path.', async(): Promise<void> => {
      await expect(mapper.mapFilePathToUrl('invalid', true)).rejects.toThrow(Error);
    });

    it('returns a generated identifier for directories.', async(): Promise<void> => {
      await expect(mapper.mapFilePathToUrl(`${rootFilepath}container/`, true)).resolves.toEqual({
        identifier: { path: `${base}container/` },
        filePath: `${rootFilepath}container/`,
        isMetadata: false,
      });
    });

    it('returns files with the default content-type.', async(): Promise<void> => {
      await expect(mapper.mapFilePathToUrl(`${rootFilepath}test`, false)).resolves.toEqual({
        identifier: { path: `${base}test` },
        filePath: `${rootFilepath}test`,
        contentType: 'application/octet-stream',
        isMetadata: false,
      });
      await expect(mapper.mapFilePathToUrl(`${rootFilepath}test.ttl`, false)).resolves.toEqual({
        identifier: { path: `${base}test.ttl` },
        filePath: `${rootFilepath}test.ttl`,
        contentType: 'application/octet-stream',
        isMetadata: false,
      });
      await expect(mapper.mapFilePathToUrl(`${rootFilepath}test.txt`, false)).resolves.toEqual({
        identifier: { path: `${base}test.txt` },
        filePath: `${rootFilepath}test.txt`,
        contentType: 'application/octet-stream',
        isMetadata: false,
      });
    });

    it('identifies metadata files.', async(): Promise<void> => {
      await expect(mapper.mapFilePathToUrl(`${rootFilepath}test.meta`, false)).resolves.toEqual({
        identifier: { path: `${base}test` },
        filePath: `${rootFilepath}test.meta`,
        contentType: 'application/octet-stream',
        isMetadata: true,
      });
    });
  });
});
