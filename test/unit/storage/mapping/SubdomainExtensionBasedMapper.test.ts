import { SubdomainExtensionBasedMapper } from '../../../../src/storage/mapping/SubdomainExtensionBasedMapper';
import { ForbiddenHttpError } from '../../../../src/util/errors/ForbiddenHttpError';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';

function getSubdomain(subdomain: string): string {
  return `http://${subdomain}.test.com/`;
}

describe('A SubdomainExtensionBasedMapper', (): void => {
  const base = 'http://test.com/';
  const rootFilepath = 'uploads/';
  const mapper = new SubdomainExtensionBasedMapper(base, rootFilepath);

  describe('mapUrlToFilePath', (): void => {
    it('converts file paths to identifiers with a subdomain.', async(): Promise<void> => {
      const identifier = { path: `${getSubdomain('alice')}test.txt` };
      await expect(mapper.mapUrlToFilePath(identifier, false, 'text/plain')).resolves.toEqual({
        identifier,
        filePath: `${rootFilepath}alice/test.txt`,
        contentType: 'text/plain',
        isMetadata: false,
      });
    });

    it('adds the default subdomain to the file path for root identifiers.', async(): Promise<void> => {
      const identifier = { path: `${base}test.txt` };
      await expect(mapper.mapUrlToFilePath(identifier, false, 'text/plain')).resolves.toEqual({
        identifier,
        filePath: `${rootFilepath}www/test.txt`,
        contentType: 'text/plain',
        isMetadata: false,
      });
    });

    it('decodes punycode when generating a file path.', async(): Promise<void> => {
      const identifier = { path: `${getSubdomain('xn--c1yn36f')}t%20est.txt` };
      await expect(mapper.mapUrlToFilePath(identifier, false, 'text/plain')).resolves.toEqual({
        identifier,
        filePath: `${rootFilepath}點看/t est.txt`,
        contentType: 'text/plain',
        isMetadata: false,
      });
    });

    it('errors if the path is invalid.', async(): Promise<void> => {
      const identifier = { path: `veryinvalidpath` };
      await expect(mapper.mapUrlToFilePath(identifier, false, 'text/plain')).rejects.toThrow(NotFoundHttpError);
    });

    it('errors if the subdomain matches the default one.', async(): Promise<void> => {
      const identifier = { path: `${getSubdomain('www')}test.txt` };
      await expect(mapper.mapUrlToFilePath(identifier, false, 'text/plain')).rejects.toThrow(ForbiddenHttpError);
    });
  });

  describe('mapFilePathToUrl', (): void => {
    it('uses the first folder in a relative path as subdomain for identifiers.', async(): Promise<void> => {
      await expect(mapper.mapFilePathToUrl(`${rootFilepath}alice/test.txt`, false)).resolves.toEqual({
        identifier: { path: `${getSubdomain('alice')}test.txt` },
        filePath: `${rootFilepath}alice/test.txt`,
        contentType: 'text/plain',
        isMetadata: false,
      });
    });

    it('correctly generates container identifiers.', async(): Promise<void> => {
      await expect(mapper.mapFilePathToUrl(`${rootFilepath}alice/test.txt`, true)).resolves.toEqual({
        identifier: { path: `${getSubdomain('alice')}test.txt/` },
        filePath: `${rootFilepath}alice/test.txt`,
        isMetadata: false,
      });
    });

    it('hides the subdomain if it matches the default one.', async(): Promise<void> => {
      await expect(mapper.mapFilePathToUrl(`${rootFilepath}www/test.txt`, false)).resolves.toEqual({
        identifier: { path: `${base}test.txt` },
        filePath: `${rootFilepath}www/test.txt`,
        contentType: 'text/plain',
        isMetadata: false,
      });
    });

    it('encodes using punycode when generating the subdomain.', async(): Promise<void> => {
      await expect(mapper.mapFilePathToUrl(`${rootFilepath}點看/t est.txt`, false)).resolves.toEqual({
        identifier: { path: `${getSubdomain('xn--c1yn36f')}t%20est.txt` },
        filePath: `${rootFilepath}點看/t est.txt`,
        contentType: 'text/plain',
        isMetadata: false,
      });
    });

    it('cannot convert the root filepath to an identifier.', async(): Promise<void> => {
      await expect(mapper.mapFilePathToUrl(rootFilepath, true)).rejects.toThrow(InternalServerError);
    });
  });
});
