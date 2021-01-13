import { BaseFileIdentifierMapper } from '../../../../src/storage/mapping/BaseFileIdentifierMapper';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';
import { trimTrailingSlashes } from '../../../../src/util/PathUtil';

jest.mock('fs');

describe('An BaseFileIdentifierMapper', (): void => {
  const base = 'http://test.com/';
  const rootFilepath = 'uploads/';
  const mapper = new BaseFileIdentifierMapper(base, rootFilepath);

  describe('mapUrlToFilePath', (): void => {
    it('throws 404 if the input path does not contain the base.', async(): Promise<void> => {
      await expect(mapper.mapUrlToFilePath({ path: 'invalid' })).rejects.toThrow(NotFoundHttpError);
    });

    it('throws 404 if the relative path does not start with a slash.', async(): Promise<void> => {
      await expect(mapper.mapUrlToFilePath({ path: `${trimTrailingSlashes(base)}test` }))
        .rejects.toThrow(new BadRequestHttpError('URL needs a / after the base'));
    });

    it('throws 400 if the input path contains relative parts.', async(): Promise<void> => {
      await expect(mapper.mapUrlToFilePath({ path: `${base}test/../test2` }))
        .rejects.toThrow(new BadRequestHttpError('Disallowed /.. segment in URL'));
    });

    it('returns the corresponding file path for container identifiers.', async(): Promise<void> => {
      await expect(mapper.mapUrlToFilePath({ path: `${base}container/` })).resolves.toEqual({
        identifier: { path: `${base}container/` },
        filePath: `${rootFilepath}container/`,
      });
    });

    it('returns the default content-type.', async(): Promise<void> => {
      await expect(mapper.mapUrlToFilePath({ path: `${base}test` })).resolves.toEqual({
        identifier: { path: `${base}test` },
        filePath: `${rootFilepath}test`,
        contentType: 'application/octet-stream',
      });
      await expect(mapper.mapUrlToFilePath({ path: `${base}test.ttl` })).resolves.toEqual({
        identifier: { path: `${base}test.ttl` },
        filePath: `${rootFilepath}test.ttl`,
        contentType: 'application/octet-stream',
      });
      await expect(mapper.mapUrlToFilePath({ path: `${base}test.txt` })).resolves.toEqual({
        identifier: { path: `${base}test.txt` },
        filePath: `${rootFilepath}test.txt`,
        contentType: 'application/octet-stream',
      });
    });

    it('generates a file path if supported content-type was provided.', async(): Promise<void> => {
      await expect(mapper.mapUrlToFilePath({ path: `${base}test.ttl` }, 'text/turtle')).resolves.toEqual({
        identifier: { path: `${base}test.ttl` },
        filePath: `${rootFilepath}test.ttl`,
        contentType: 'text/turtle',
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
      });
    });

    it('returns files with the default content-type.', async(): Promise<void> => {
      await expect(mapper.mapFilePathToUrl(`${rootFilepath}test`, false)).resolves.toEqual({
        identifier: { path: `${base}test` },
        filePath: `${rootFilepath}test`,
        contentType: 'application/octet-stream',
      });
      await expect(mapper.mapFilePathToUrl(`${rootFilepath}test.ttl`, false)).resolves.toEqual({
        identifier: { path: `${base}test.ttl` },
        filePath: `${rootFilepath}test.ttl`,
        contentType: 'application/octet-stream',
      });
      await expect(mapper.mapFilePathToUrl(`${rootFilepath}test.txt`, false)).resolves.toEqual({
        identifier: { path: `${base}test.txt` },
        filePath: `${rootFilepath}test.txt`,
        contentType: 'application/octet-stream',
      });
    });
  });
});
