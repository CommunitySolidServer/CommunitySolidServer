import { FixedContentTypeMapper } from '../../../../src/storage/mapping/FixedContentTypeMapper';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';
import { trimTrailingSlashes } from '../../../../src/util/PathUtil';

jest.mock('node:fs');

describe('An FixedContentTypeMapper', (): void => {
  const base = 'http://test.com/';
  const rootFilepath = 'uploads/';
  describe('without suffixes', (): void => {
    const mapper = new FixedContentTypeMapper(base, rootFilepath, 'text/turtle');

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
        const result = mapper.mapUrlToFilePath({ path: `${base}test/../test2` }, false);
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

      it('always returns the configured content-type.', async(): Promise<void> => {
        await expect(mapper.mapUrlToFilePath({ path: `${base}test` }, false)).resolves.toEqual({
          identifier: { path: `${base}test` },
          filePath: `${rootFilepath}test`,
          contentType: 'text/turtle',
          isMetadata: false,
        });
        await expect(mapper.mapUrlToFilePath({ path: `${base}test.ttl` }, false)).resolves.toEqual({
          identifier: { path: `${base}test.ttl` },
          filePath: `${rootFilepath}test.ttl`,
          contentType: 'text/turtle',
          isMetadata: false,
        });
        await expect(mapper.mapUrlToFilePath({ path: `${base}test.txt` }, false)).resolves.toEqual({
          identifier: { path: `${base}test.txt` },
          filePath: `${rootFilepath}test.txt`,
          contentType: 'text/turtle',
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

      it('throws 400 if the given content-type is not supported.', async(): Promise<void> => {
        await expect(mapper.mapUrlToFilePath({ path: `${base}test.ttl` }, false, 'application/n-quads')).rejects
          .toThrow(
            new BadRequestHttpError(`Unsupported content type application/n-quads, only text/turtle is allowed`),
          );
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

      it('returns files with the configured content-type.', async(): Promise<void> => {
        await expect(mapper.mapFilePathToUrl(`${rootFilepath}test`, false)).resolves.toEqual({
          identifier: { path: `${base}test` },
          filePath: `${rootFilepath}test`,
          contentType: 'text/turtle',
          isMetadata: false,
        });
        await expect(mapper.mapFilePathToUrl(`${rootFilepath}test.ttl`, false)).resolves.toEqual({
          identifier: { path: `${base}test.ttl` },
          filePath: `${rootFilepath}test.ttl`,
          contentType: 'text/turtle',
          isMetadata: false,
        });
        await expect(mapper.mapFilePathToUrl(`${rootFilepath}test.txt`, false)).resolves.toEqual({
          identifier: { path: `${base}test.txt` },
          filePath: `${rootFilepath}test.txt`,
          contentType: 'text/turtle',
          isMetadata: false,
        });
      });
    });
  });

  describe('with path suffix', (): void => {
    // Internally, everything uses the .ttl extension, but it's exposed without.
    const mapper = new FixedContentTypeMapper(base, rootFilepath, 'text/turtle', '.ttl');

    describe('mapUrlToFilePath', (): void => {
      it('returns the corresponding file path for container identifiers.', async(): Promise<void> => {
        await expect(mapper.mapUrlToFilePath({ path: `${base}container/` }, false)).resolves.toEqual({
          identifier: { path: `${base}container/` },
          filePath: `${rootFilepath}container/`,
          isMetadata: false,
        });
      });

      it('always returns the configured content-type.', async(): Promise<void> => {
        await expect(mapper.mapUrlToFilePath({ path: `${base}test` }, false)).resolves.toEqual({
          identifier: { path: `${base}test` },
          filePath: `${rootFilepath}test.ttl`,
          contentType: 'text/turtle',
          isMetadata: false,
        });
        await expect(mapper.mapUrlToFilePath({ path: `${base}test.ttl` }, false)).resolves.toEqual({
          identifier: { path: `${base}test.ttl` },
          filePath: `${rootFilepath}test.ttl.ttl`,
          contentType: 'text/turtle',
          isMetadata: false,
        });
        await expect(mapper.mapUrlToFilePath({ path: `${base}test.txt` }, false)).resolves.toEqual({
          identifier: { path: `${base}test.txt` },
          filePath: `${rootFilepath}test.txt.ttl`,
          contentType: 'text/turtle',
          isMetadata: false,
        });
      });

      it('generates a file path if supported content-type was provided.', async(): Promise<void> => {
        await expect(mapper.mapUrlToFilePath({ path: `${base}test.ttl` }, false, 'text/turtle')).resolves.toEqual({
          identifier: { path: `${base}test.ttl` },
          filePath: `${rootFilepath}test.ttl.ttl`,
          contentType: 'text/turtle',
          isMetadata: false,
        });
      });

      it('throws 400 if the given content-type is not supported.', async(): Promise<void> => {
        await expect(mapper.mapUrlToFilePath({ path: `${base}test.ttl` }, false, 'application/n-quads')).rejects
          .toThrow(
            new BadRequestHttpError(`Unsupported content type application/n-quads, only text/turtle is allowed`),
          );
      });
    });

    describe('mapFilePathToUrl', (): void => {
      it('returns a generated identifier for directories.', async(): Promise<void> => {
        await expect(mapper.mapFilePathToUrl(`${rootFilepath}container/`, true)).resolves.toEqual({
          identifier: { path: `${base}container/` },
          filePath: `${rootFilepath}container/`,
          isMetadata: false,
        });
      });

      it('returns files with the configured content-type.', async(): Promise<void> => {
        await expect(mapper.mapFilePathToUrl(`${rootFilepath}test.ttl`, false)).resolves.toEqual({
          identifier: { path: `${base}test` },
          filePath: `${rootFilepath}test.ttl`,
          contentType: 'text/turtle',
          isMetadata: false,
        });
      });

      it('throws 404 if the input path does not end with the suffix.', async(): Promise<void> => {
        await expect(mapper.mapFilePathToUrl(`${rootFilepath}test`, false)).rejects.toThrow(NotFoundHttpError);
        await expect(mapper.mapFilePathToUrl(`${rootFilepath}test.txt`, false)).rejects.toThrow(NotFoundHttpError);
      });

      it('returns a generated file path for metadata regardless of the suffix.', async(): Promise<void> => {
        await expect(mapper.mapFilePathToUrl(`${rootFilepath}.meta`, false)).resolves.toEqual({
          identifier: { path: `${base}` },
          filePath: `${rootFilepath}.meta`,
          contentType: 'text/turtle',
          isMetadata: true,
        });
      });
    });
  });

  describe('with url suffix', (): void => {
    // Internally, no extensions are used, but everything is exposed with the .ttl extension
    const mapper = new FixedContentTypeMapper(base, rootFilepath, 'text/turtle', undefined, '.ttl');

    describe('mapUrlToFilePath', (): void => {
      it('returns the corresponding file path for container identifiers.', async(): Promise<void> => {
        await expect(mapper.mapUrlToFilePath({ path: `${base}container/` }, false)).resolves.toEqual({
          identifier: { path: `${base}container/` },
          filePath: `${rootFilepath}container/`,
          isMetadata: false,
        });
      });

      it('always returns the configured content-type.', async(): Promise<void> => {
        await expect(mapper.mapUrlToFilePath({ path: `${base}test.ttl` }, false)).resolves.toEqual({
          identifier: { path: `${base}test.ttl` },
          filePath: `${rootFilepath}test`,
          contentType: 'text/turtle',
          isMetadata: false,
        });
        await expect(mapper.mapUrlToFilePath({ path: `${base}test.txt.ttl` }, false)).resolves.toEqual({
          identifier: { path: `${base}test.txt.ttl` },
          filePath: `${rootFilepath}test.txt`,
          contentType: 'text/turtle',
          isMetadata: false,
        });
      });

      it('generates a file path if supported content-type was provided.', async(): Promise<void> => {
        await expect(mapper.mapUrlToFilePath({ path: `${base}test.ttl` }, false, 'text/turtle')).resolves.toEqual({
          identifier: { path: `${base}test.ttl` },
          filePath: `${rootFilepath}test`,
          contentType: 'text/turtle',
          isMetadata: false,
        });
      });

      it('throws 404 if the url does not end with the suffix.', async(): Promise<void> => {
        await expect(mapper.mapUrlToFilePath({ path: `${base}test.nq` }, false, 'text/turtle')).rejects
          .toThrow(NotFoundHttpError);
        await expect(mapper.mapUrlToFilePath({ path: `${base}test` }, false, 'text/turtle')).rejects
          .toThrow(NotFoundHttpError);
      });

      it('throws 400 if the given content-type is not supported.', async(): Promise<void> => {
        await expect(mapper.mapUrlToFilePath({ path: `${base}test.ttl` }, false, 'application/n-quads')).rejects
          .toThrow(
            new BadRequestHttpError(`Unsupported content type application/n-quads, only text/turtle is allowed`),
          );
      });
    });

    describe('mapFilePathToUrl', (): void => {
      it('returns a generated identifier for directories.', async(): Promise<void> => {
        await expect(mapper.mapFilePathToUrl(`${rootFilepath}container/`, true)).resolves.toEqual({
          identifier: { path: `${base}container/` },
          filePath: `${rootFilepath}container/`,
          isMetadata: false,
        });
      });

      it('returns files with the configured content-type.', async(): Promise<void> => {
        await expect(mapper.mapFilePathToUrl(`${rootFilepath}test`, false)).resolves.toEqual({
          identifier: { path: `${base}test.ttl` },
          filePath: `${rootFilepath}test`,
          contentType: 'text/turtle',
          isMetadata: false,
        });
        await expect(mapper.mapFilePathToUrl(`${rootFilepath}test.ttl`, false)).resolves.toEqual({
          identifier: { path: `${base}test.ttl.ttl` },
          filePath: `${rootFilepath}test.ttl`,
          contentType: 'text/turtle',
          isMetadata: false,
        });
        await expect(mapper.mapFilePathToUrl(`${rootFilepath}test.txt`, false)).resolves.toEqual({
          identifier: { path: `${base}test.txt.ttl` },
          filePath: `${rootFilepath}test.txt`,
          contentType: 'text/turtle',
          isMetadata: false,
        });
      });
    });
  });

  describe('with path and url suffix', (): void => {
    // Internally, everything uses the .nq extension, but it's exposed with the .ttl extension.
    const mapper = new FixedContentTypeMapper(base, rootFilepath, 'text/turtle', '.nq', '.ttl');

    describe('mapUrlToFilePath', (): void => {
      it('returns the corresponding file path for container identifiers.', async(): Promise<void> => {
        await expect(mapper.mapUrlToFilePath({ path: `${base}container/` }, false)).resolves.toEqual({
          identifier: { path: `${base}container/` },
          filePath: `${rootFilepath}container/`,
          isMetadata: false,
        });
      });

      it('always returns the configured content-type.', async(): Promise<void> => {
        await expect(mapper.mapUrlToFilePath({ path: `${base}test.ttl` }, false)).resolves.toEqual({
          identifier: { path: `${base}test.ttl` },
          filePath: `${rootFilepath}test.nq`,
          contentType: 'text/turtle',
          isMetadata: false,
        });
      });

      it('throws 404 if the url does not end with the suffix.', async(): Promise<void> => {
        await expect(mapper.mapUrlToFilePath({ path: `${base}test.nq` }, false, 'text/turtle')).rejects
          .toThrow(NotFoundHttpError);
        await expect(mapper.mapUrlToFilePath({ path: `${base}test` }, false, 'text/turtle')).rejects
          .toThrow(NotFoundHttpError);
      });
    });

    describe('mapFilePathToUrl', (): void => {
      it('returns a generated identifier for directories.', async(): Promise<void> => {
        await expect(mapper.mapFilePathToUrl(`${rootFilepath}container/`, true)).resolves.toEqual({
          identifier: { path: `${base}container/` },
          filePath: `${rootFilepath}container/`,
          isMetadata: false,
        });
      });

      it('returns files with the configured content-type.', async(): Promise<void> => {
        await expect(mapper.mapFilePathToUrl(`${rootFilepath}test.nq`, false)).resolves.toEqual({
          identifier: { path: `${base}test.ttl` },
          filePath: `${rootFilepath}test.nq`,
          contentType: 'text/turtle',
          isMetadata: false,
        });
      });

      it('throws 404 if the input path does not end with the suffix.', async(): Promise<void> => {
        await expect(mapper.mapFilePathToUrl(`${rootFilepath}test`, false)).rejects.toThrow(NotFoundHttpError);
        await expect(mapper.mapFilePathToUrl(`${rootFilepath}test.ttl`, false)).rejects.toThrow(NotFoundHttpError);
      });
    });
  });
});
