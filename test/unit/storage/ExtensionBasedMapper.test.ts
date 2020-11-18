import fs from 'fs';
import { ExtensionBasedMapper } from '../../../src/storage/ExtensionBasedMapper';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';
import { UnsupportedHttpError } from '../../../src/util/errors/UnsupportedHttpError';
import { trimTrailingSlashes } from '../../../src/util/PathUtil';

jest.mock('fs');

describe('An ExtensionBasedMapper', (): void => {
  const base = 'http://test.com/';
  const rootFilepath = 'uploads/';
  const mapper = new ExtensionBasedMapper(base, rootFilepath);
  let fsPromises: Record<string, jest.Mock>;

  beforeEach(async(): Promise<void> => {
    jest.clearAllMocks();
    fs.promises = {
      readdir: jest.fn(),
    } as any;
    fsPromises = fs.promises as any;
  });

  describe('mapUrlToFilePath', (): void => {
    it('throws 404 if the input path does not contain the base.', async(): Promise<void> => {
      await expect(mapper.mapUrlToFilePath({ path: 'invalid' })).rejects.toThrow(NotFoundHttpError);
    });

    it('throws 404 if the relative path does not start with a slash.', async(): Promise<void> => {
      await expect(mapper.mapUrlToFilePath({ path: `${trimTrailingSlashes(base)}test` }))
        .rejects.toThrow(new UnsupportedHttpError('URL needs a / after the base'));
    });

    it('throws 400 if the input path contains relative parts.', async(): Promise<void> => {
      await expect(mapper.mapUrlToFilePath({ path: `${base}test/../test2` }))
        .rejects.toThrow(new UnsupportedHttpError('Disallowed /.. segment in URL'));
    });

    it('returns the corresponding file path for container identifiers.', async(): Promise<void> => {
      await expect(mapper.mapUrlToFilePath({ path: `${base}container/` })).resolves.toEqual({
        identifier: { path: `${base}container/` },
        filePath: `${rootFilepath}container/`,
      });
    });

    it('rejects URLs that end with "$.{extension}".', async(): Promise<void> => {
      await expect(mapper.mapUrlToFilePath({ path: `${base}test$.txt` }))
        .rejects.toThrow(new UnsupportedHttpError('Identifiers cannot contain a dollar sign before their extension'));
    });

    it('throws 404 when looking in a folder that does not exist.', async(): Promise<void> => {
      fsPromises.readdir.mockImplementation((): void => {
        throw new Error('does not exist');
      });
      await expect(mapper.mapUrlToFilePath({ path: `${base}no/test.txt` })).rejects.toThrow(NotFoundHttpError);
    });

    it('throws 404 when looking for a file that does not exist.', async(): Promise<void> => {
      fsPromises.readdir.mockReturnValue([ 'test.ttl' ]);
      await expect(mapper.mapUrlToFilePath({ path: `${base}test.txt` })).rejects.toThrow(NotFoundHttpError);
    });

    it('determines the content-type based on the extension.', async(): Promise<void> => {
      fsPromises.readdir.mockReturnValue([ 'test.txt' ]);
      await expect(mapper.mapUrlToFilePath({ path: `${base}test.txt` })).resolves.toEqual({
        identifier: { path: `${base}test.txt` },
        filePath: `${rootFilepath}test.txt`,
        contentType: 'text/plain',
      });
    });

    it('matches even if the content-type does not match the extension.', async(): Promise<void> => {
      fsPromises.readdir.mockReturnValue([ 'test.txt$.ttl' ]);
      await expect(mapper.mapUrlToFilePath({ path: `${base}test.txt` })).resolves.toEqual({
        identifier: { path: `${base}test.txt` },
        filePath: `${rootFilepath}test.txt$.ttl`,
        contentType: 'text/turtle',
      });
    });

    it('generates a file path if the content-type was provided.', async(): Promise<void> => {
      await expect(mapper.mapUrlToFilePath({ path: `${base}test.txt` }, 'text/plain')).resolves.toEqual({
        identifier: { path: `${base}test.txt` },
        filePath: `${rootFilepath}test.txt`,
        contentType: 'text/plain',
      });
    });

    it('adds an extension if the given extension does not match the given content-type.', async(): Promise<void> => {
      await expect(mapper.mapUrlToFilePath({ path: `${base}test.txt` }, 'text/turtle')).resolves.toEqual({
        identifier: { path: `${base}test.txt` },
        filePath: `${rootFilepath}test.txt$.ttl`,
        contentType: 'text/turtle',
      });
    });

    it('throws 400 if the given content-type is not recognized.', async(): Promise<void> => {
      await expect(mapper.mapUrlToFilePath({ path: `${base}test.txt` }, 'fake/data'))
        .rejects.toThrow(new UnsupportedHttpError(`Unsupported content type fake/data`));
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

    it('returns a generated identifier for files with corresponding content-type.', async(): Promise<void> => {
      await expect(mapper.mapFilePathToUrl(`${rootFilepath}test.txt`, false)).resolves.toEqual({
        identifier: { path: `${base}test.txt` },
        filePath: `${rootFilepath}test.txt`,
        contentType: 'text/plain',
      });
    });

    it('removes appended extensions.', async(): Promise<void> => {
      await expect(mapper.mapFilePathToUrl(`${rootFilepath}test.txt$.ttl`, false)).resolves.toEqual({
        identifier: { path: `${base}test.txt` },
        filePath: `${rootFilepath}test.txt$.ttl`,
        contentType: 'text/turtle',
      });
    });

    it('sets the content-type to application/octet-stream if there is no extension.', async(): Promise<void> => {
      await expect(mapper.mapFilePathToUrl(`${rootFilepath}test`, false)).resolves.toEqual({
        identifier: { path: `${base}test` },
        filePath: `${rootFilepath}test`,
        contentType: 'application/octet-stream',
      });
    });
  });
});
