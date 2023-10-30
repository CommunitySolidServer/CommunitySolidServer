import 'jest-rdf';
import type { Readable } from 'node:stream';
import { DataFactory } from 'n3';
import type { Representation } from '../../../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import { FileDataAccessor } from '../../../../src/storage/accessors/FileDataAccessor';
import { ExtensionBasedMapper } from '../../../../src/storage/mapping/ExtensionBasedMapper';
import type { FileIdentifierMapper, ResourceLink } from '../../../../src/storage/mapping/FileIdentifierMapper';
import { APPLICATION_OCTET_STREAM } from '../../../../src/util/ContentTypes';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';
import type { SystemError } from '../../../../src/util/errors/SystemError';
import { UnsupportedMediaTypeHttpError } from '../../../../src/util/errors/UnsupportedMediaTypeHttpError';
import type { Guarded } from '../../../../src/util/GuardedStream';
import { isContainerPath } from '../../../../src/util/PathUtil';
import { guardedStreamFrom, readableToString } from '../../../../src/util/StreamUtil';
import { toLiteral } from '../../../../src/util/TermUtil';
import { CONTENT_TYPE, DC, LDP, POSIX, RDF, SOLID_META, XSD } from '../../../../src/util/Vocabularies';
import { mockFileSystem } from '../../../util/Util';

const { namedNode, quad } = DataFactory;

jest.mock('node:fs');
jest.mock('fs-extra');

const rootFilePath = 'uploads';
const now = new Date();
// All relevant functions do not care about the milliseconds or remove them
now.setMilliseconds(0);

describe('A FileDataAccessor', (): void => {
  const base = 'http://test.com/';
  let mapper: FileIdentifierMapper;
  let accessor: FileDataAccessor;
  let cache: { data: any };
  let metadata: RepresentationMetadata;
  let data: Guarded<Readable>;

  beforeEach(async(): Promise<void> => {
    cache = mockFileSystem(rootFilePath, now);
    mapper = new ExtensionBasedMapper(base, rootFilePath);
    accessor = new FileDataAccessor(mapper);

    metadata = new RepresentationMetadata(APPLICATION_OCTET_STREAM);

    data = guardedStreamFrom([ 'data' ]);
  });

  it('can only handle binary data.', async(): Promise<void> => {
    await expect(accessor.canHandle({ binary: true } as Representation)).resolves.toBeUndefined();
    const result = accessor.canHandle({ binary: false } as Representation);
    await expect(result).rejects.toThrow(UnsupportedMediaTypeHttpError);
    await expect(result).rejects.toThrow('Only binary data is supported.');
  });

  describe('getting data', (): void => {
    it('throws a 404 if the identifier does not start with the base.', async(): Promise<void> => {
      await expect(accessor.getData({ path: 'badpath' })).rejects.toThrow(NotFoundHttpError);
    });

    it('throws a 404 if the identifier does not match an existing file.', async(): Promise<void> => {
      await expect(accessor.getData({ path: `${base}resource` })).rejects.toThrow(NotFoundHttpError);
    });

    it('throws a 404 if the identifier matches a directory.', async(): Promise<void> => {
      cache.data = { resource: {}};
      await expect(accessor.getData({ path: `${base}resource` })).rejects.toThrow(NotFoundHttpError);
    });

    it('returns the corresponding data.', async(): Promise<void> => {
      cache.data = { resource: 'data' };
      const stream = await accessor.getData({ path: `${base}resource` });
      await expect(readableToString(stream)).resolves.toBe('data');
    });

    it('throws an error if something else went wrong.', async(): Promise<void> => {
      jest.requireMock('fs-extra').stat = (): any => {
        throw new Error('error');
      };
      await expect(accessor.getData({ path: `${base}resource` })).rejects.toThrow('error');
    });
  });

  describe('getting metadata', (): void => {
    it('throws a 404 if the identifier does not start with the base.', async(): Promise<void> => {
      await expect(accessor.getMetadata({ path: 'badpath' })).rejects.toThrow(NotFoundHttpError);
    });

    it('throws a 404 if the identifier does not match an existing file.', async(): Promise<void> => {
      await expect(accessor.getMetadata({ path: `${base}container/` })).rejects.toThrow(NotFoundHttpError);
    });

    it('throws a 404 if it matches something that is no file or directory.', async(): Promise<void> => {
      cache.data = { resource: 5 };
      await expect(accessor.getMetadata({ path: `${base}resource` })).rejects.toThrow(NotFoundHttpError);
    });

    it('throws an error if something else went wrong.', async(): Promise<void> => {
      jest.requireMock('fs-extra').lstat = (): any => {
        throw new Error('error');
      };
      await expect(accessor.getMetadata({ path: base })).rejects.toThrow('error');
    });

    it('throws a 404 if the trailing slash does not match its type.', async(): Promise<void> => {
      cache.data = { resource: 'data' };
      await expect(accessor.getMetadata({ path: `${base}resource/` })).rejects.toThrow(NotFoundHttpError);
      cache.data = { container: {}};
      await expect(accessor.getMetadata({ path: `${base}container` })).rejects.toThrow(NotFoundHttpError);
    });

    it('generates the metadata for a resource.', async(): Promise<void> => {
      cache.data = { 'resource.ttl': 'data' };
      metadata = await accessor.getMetadata({ path: `${base}resource.ttl` });
      expect(metadata.identifier.value).toBe(`${base}resource.ttl`);
      expect(metadata.contentType).toBe('text/turtle');
      expect(metadata.get(RDF.terms.type)?.value).toBe(LDP.Resource);
      expect(metadata.get(POSIX.terms.size)).toEqualRdfTerm(toLiteral('data'.length, XSD.terms.integer));
      expect(metadata.get(DC.terms.modified)).toEqualRdfTerm(toLiteral(now.toISOString(), XSD.terms.dateTime));
      expect(metadata.get(POSIX.terms.mtime))
        .toEqualRdfTerm(toLiteral(Math.floor(now.getTime() / 1000), XSD.terms.integer));
      // `dc:modified` is in the default graph
      expect(metadata.quads(null, null, null, SOLID_META.terms.ResponseMetadata)).toHaveLength(2);
    });

    it('does not generate size metadata for a container.', async(): Promise<void> => {
      cache.data = { container: {}};
      metadata = await accessor.getMetadata({ path: `${base}container/` });
      expect(metadata.get(POSIX.terms.size)).toBeUndefined();
      expect(metadata.get(DC.terms.modified)).toEqualRdfTerm(toLiteral(now.toISOString(), XSD.terms.dateTime));
    });

    it('generates the metadata for a container.', async(): Promise<void> => {
      cache.data = {
        container: {
          resource: 'data',
          'resource.meta': 'metadata',
          notAFile: 5,
          container2: {},
        },
      };
      metadata = await accessor.getMetadata({ path: `${base}container/` });
      expect(metadata.identifier.value).toBe(`${base}container/`);
      expect(metadata.getAll(RDF.terms.type)).toEqualRdfTermArray(
        [ LDP.terms.Container, LDP.terms.BasicContainer, LDP.terms.Resource ],
      );
      expect(metadata.get(POSIX.terms.size)).toBeUndefined();
      expect(metadata.get(DC.terms.modified)).toEqualRdfTerm(toLiteral(now.toISOString(), XSD.terms.dateTime));
      expect(metadata.get(POSIX.terms.mtime))
        .toEqualRdfTerm(toLiteral(Math.floor(now.getTime() / 1000), XSD.terms.integer));
      // `dc:modified` is in the default graph
      expect(metadata.quads(null, null, null, SOLID_META.terms.ResponseMetadata)).toHaveLength(1);
    });

    it('generates metadata for container child resources.', async(): Promise<void> => {
      cache.data = {
        container: {
          resource: 'data',
          'resource.meta': 'metadata',
          symlink: Symbol(`${rootFilePath}/container/resource`),
          symlinkContainer: Symbol(`${rootFilePath}/container/container2`),
          symlinkInvalid: Symbol(`${rootFilePath}/invalid`),
          notAFile: 5,
          container2: {},
        },
      };

      const children = [];
      for await (const child of accessor.getChildren({ path: `${base}container/` })) {
        children.push(child);
      }

      // Identifiers
      expect(children).toHaveLength(4);
      expect(new Set(children.map((child): string => child.identifier.value))).toEqual(new Set([
        `${base}container/container2/`,
        `${base}container/resource`,
        `${base}container/symlink`,
        `${base}container/symlinkContainer/`,
      ]));

      // Containers
      for (const child of children.filter(({ identifier }): boolean => identifier.value.endsWith('/'))) {
        const types = child.getAll(RDF.terms.type).map((term): string => term.value);
        expect(types).toContain(LDP.Resource);
        expect(types).toContain(LDP.Container);
        expect(types).toContain(LDP.BasicContainer);
      }

      // Documents
      for (const child of children.filter(({ identifier }): boolean => !identifier.value.endsWith('/'))) {
        const types = child.getAll(RDF.terms.type).map((term): string => term.value);
        expect(types).toContain(LDP.Resource);
        expect(types).toContain('http://www.w3.org/ns/iana/media-types/application/octet-stream#Resource');
        expect(types).not.toContain(LDP.Container);
        expect(types).not.toContain(LDP.BasicContainer);
      }

      // All resources
      for (const child of children) {
        expect(child.get(DC.terms.modified)).toEqualRdfTerm(toLiteral(now.toISOString(), XSD.terms.dateTime));
        expect(child.get(POSIX.terms.mtime))
          .toEqualRdfTerm(toLiteral(Math.floor(now.getTime() / 1000), XSD.terms.integer));
        // `dc:modified` is in the default graph
        expect(child.quads(null, null, null, SOLID_META.terms.ResponseMetadata))
          .toHaveLength(isContainerPath(child.identifier.value) ? 1 : 2);
      }
    });

    it('does not generate IANA URIs for children with invalid content-types.', async(): Promise<void> => {
      cache.data = {
        container: {
          resource1: 'data',
          resource2: 'badData',
        },
      };

      const badMapper: jest.Mocked<FileIdentifierMapper> = {
        mapFilePathToUrl: jest.fn(async(filePath: string, isContainer: boolean): Promise<ResourceLink> => {
          const result = await mapper.mapFilePathToUrl(filePath, isContainer);
          if (filePath.endsWith('resource2')) {
            result.contentType = 'this is not a valid type';
          }
          return result;
        }),
        mapUrlToFilePath: jest.fn(async(...args): Promise<ResourceLink> => mapper.mapUrlToFilePath(...args)),
      };

      accessor = new FileDataAccessor(badMapper);

      const children = [];
      for await (const child of accessor.getChildren({ path: `${base}container/` })) {
        children.push(child);
      }

      // Identifiers
      expect(children).toHaveLength(2);
      expect(new Set(children.map((child): string => child.identifier.value))).toEqual(new Set([
        `${base}container/resource1`,
        `${base}container/resource2`,
      ]));

      const types1 = children[0].getAll(RDF.terms.type).map((term): string => term.value);
      const types2 = children[1].getAll(RDF.terms.type).map((term): string => term.value);

      expect(types1).toContain('http://www.w3.org/ns/iana/media-types/application/octet-stream#Resource');
      for (const type of types2) {
        expect(type).not.toMatch(/^http:\/\/www\.w3.org\/ns\/iana\/media-types\//u);
      }
    });

    it('adds stored metadata when requesting metadata.', async(): Promise<void> => {
      cache.data = { resource: 'data', 'resource.meta': '<http://this> <http://is> <http://metadata>.' };
      metadata = await accessor.getMetadata({ path: `${base}resource` });
      expect(metadata.quads().some((qd): boolean => qd.subject.value === 'http://this')).toBe(true);

      cache.data = { container: { '.meta': '<http://this> <http://is> <http://metadata>.' }};
      metadata = await accessor.getMetadata({ path: `${base}container/` });
      expect(metadata.quads().some((qd): boolean => qd.subject.value === 'http://this')).toBe(true);
    });

    it('throws an error if there is a problem with the internal metadata.', async(): Promise<void> => {
      cache.data = { resource: 'data', 'resource.meta': 'invalid metadata!.' };
      await expect(accessor.getMetadata({ path: `${base}resource` }))
        .rejects.toThrow('Unexpected "invalid" on line 1.');
    });
  });

  describe('writing a document', (): void => {
    it('throws a 404 if the identifier does not start with the base.', async(): Promise<void> => {
      await expect(accessor.writeDocument({ path: 'badpath' }, data, metadata))
        .rejects.toThrow(NotFoundHttpError);
    });

    it('writes the data to the corresponding file.', async(): Promise<void> => {
      await expect(accessor.writeDocument({ path: `${base}resource` }, data, metadata)).resolves.toBeUndefined();
      expect(cache.data.resource).toBe('data');
    });

    it('writes metadata to the corresponding metadata file.', async(): Promise<void> => {
      metadata = new RepresentationMetadata(
        { path: `${base}res.ttl` },
        { [CONTENT_TYPE]: 'text/turtle', likes: 'apples' },
      );
      await expect(accessor.writeDocument({ path: `${base}res.ttl` }, data, metadata)).resolves.toBeUndefined();
      expect(cache.data['res.ttl']).toBe('data');
      expect(cache.data['res.ttl.meta']).toMatch(`<${base}res.ttl> <likes> "apples".`);
    });

    it('does not write metadata that is stored by the file system.', async(): Promise<void> => {
      metadata.add(RDF.terms.type, LDP.terms.Resource);
      await expect(accessor.writeDocument({ path: `${base}resource` }, data, metadata)).resolves.toBeUndefined();
      expect(cache.data.resource).toBe('data');
      expect(cache.data['resource.meta']).toBeUndefined();
    });

    it('deletes existing metadata if nothing new needs to be stored.', async(): Promise<void> => {
      cache.data = { resource: 'data', 'resource.meta': 'metadata!' };
      await expect(accessor.writeDocument({ path: `${base}resource` }, data, metadata)).resolves.toBeUndefined();
      expect(cache.data.resource).toBe('data');
      expect(cache.data['resource.meta']).toBeUndefined();
    });

    it('errors if there is a problem deleting the old metadata file.', async(): Promise<void> => {
      cache.data = { resource: 'data', 'resource.meta': 'metadata!' };
      jest.requireMock('fs-extra').remove = (): any => {
        throw new Error('error');
      };
      await expect(accessor.writeDocument({ path: `${base}resource` }, data, metadata))
        .rejects.toThrow('error');
    });

    it('throws if something went wrong writing a file.', async(): Promise<void> => {
      data.read = (): any => {
        data.emit('error', new Error('error'));
        return null;
      };
      await expect(accessor.writeDocument({ path: `${base}resource` }, data, metadata))
        .rejects.toThrow('error');
    });

    it('deletes the metadata file if something went wrong writing the file.', async(): Promise<void> => {
      data.read = (): any => {
        data.emit('error', new Error('error'));
        return null;
      };
      metadata.add(namedNode('likes'), 'apples');
      await expect(accessor.writeDocument({ path: `${base}resource` }, data, metadata))
        .rejects.toThrow('error');
      expect(cache.data['resource.meta']).toBeUndefined();
    });

    it('updates the filename if the content-type gets updated.', async(): Promise<void> => {
      cache.data = { 'resource$.ttl': '<this> <is> <data>.', 'resource.meta': '<this> <is> <metadata>.' };
      metadata.identifier = DataFactory.namedNode(`${base}resource`);
      metadata.contentType = 'text/plain';
      metadata.add(namedNode('new'), 'metadata');
      await expect(accessor.writeDocument({ path: `${base}resource` }, data, metadata))
        .resolves.toBeUndefined();
      expect(cache.data).toEqual({
        'resource$.txt': 'data',
        'resource.meta': expect.stringMatching(`<${base}resource> <new> "metadata".`),
      });
    });

    it('does not try to update the content-type if there is no original file.', async(): Promise<void> => {
      metadata.identifier = DataFactory.namedNode(`${base}resource.txt`);
      metadata.contentType = 'text/turtle';
      metadata.add(namedNode('new'), 'metadata');
      await expect(accessor.writeDocument({ path: `${base}resource.txt` }, data, metadata))
        .resolves.toBeUndefined();
      expect(cache.data).toEqual({
        'resource.txt$.ttl': 'data',
        'resource.txt.meta': expect.stringMatching(`<${base}resource.txt> <new> "metadata".`),
      });
    });

    it('throws an error if there is an issue deleting the original file.', async(): Promise<void> => {
      cache.data = { 'resource$.ttl': '<this> <is> <data>.' };
      jest.requireMock('fs-extra').remove = (): any => {
        const error = new Error('error') as SystemError;
        error.code = 'EISDIR';
        error.syscall = 'unlink';
        throw error;
      };

      metadata.contentType = 'text/plain';
      await expect(accessor.writeDocument({ path: `${base}resource` }, data, metadata))
        .rejects.toThrow('error');
    });
  });

  describe('writing a container', (): void => {
    it('throws a 404 if the identifier does not start with the base.', async(): Promise<void> => {
      await expect(accessor.writeContainer({ path: 'badpath' }, metadata)).rejects.toThrow(NotFoundHttpError);
    });

    it('creates the corresponding directory.', async(): Promise<void> => {
      await expect(accessor.writeContainer({ path: `${base}container/` }, metadata)).resolves.toBeUndefined();
      expect(cache.data.container).toEqual({});
    });

    it('can handle the directory already existing.', async(): Promise<void> => {
      cache.data.container = {};
      await expect(accessor.writeContainer({ path: `${base}container/` }, metadata)).resolves.toBeUndefined();
      expect(cache.data.container).toEqual({});
    });

    it('throws other errors when making a directory.', async(): Promise<void> => {
      jest.requireMock('fs-extra').ensureDir = (): any => {
        throw new Error('error');
      };
      await expect(accessor.writeContainer({ path: base }, metadata)).rejects.toThrow('error');
    });

    it('writes metadata to the corresponding metadata file.', async(): Promise<void> => {
      metadata = new RepresentationMetadata({ path: `${base}container/` }, { likes: 'apples' });
      await expect(accessor.writeContainer({ path: `${base}container/` }, metadata)).resolves.toBeUndefined();
      expect(cache.data.container).toEqual({ '.meta': expect.stringMatching(`<${base}container/> <likes> "apples".`) });
    });

    it('overwrites existing metadata.', async(): Promise<void> => {
      cache.data.container = { '.meta': `<${base}container/> <likes> "pears".` };
      metadata = new RepresentationMetadata({ path: `${base}container/` }, { likes: 'apples' });
      await expect(accessor.writeContainer({ path: `${base}container/` }, metadata)).resolves.toBeUndefined();
      expect(cache.data.container).toEqual({ '.meta': expect.stringMatching(`<${base}container/> <likes> "apples".`) });
    });

    it('does not write metadata that is stored by the file system.', async(): Promise<void> => {
      metadata = new RepresentationMetadata(
        { path: `${base}container/` },
        { [RDF.type]: [ LDP.terms.BasicContainer, LDP.terms.Resource ]},
      );
      await expect(accessor.writeContainer({ path: `${base}container/` }, metadata)).resolves.toBeUndefined();
      expect(cache.data.container).toEqual({});
    });

    it('can write to the root container.', async(): Promise<void> => {
      metadata = new RepresentationMetadata({ path: `${base}` }, { likes: 'apples' });
      await expect(accessor.writeContainer({ path: `${base}` }, metadata)).resolves.toBeUndefined();
      expect(cache.data).toEqual({ '.meta': expect.stringMatching(`<${base}> <likes> "apples".`) });
    });
  });

  describe('writing metadata', (): void => {
    it('writes metadata to the metadata resource.', async(): Promise<void> => {
      const resourceIdentifier = { path: `${base}resource` };
      const inputMetadata = new RepresentationMetadata(resourceIdentifier, { [RDF.type]: LDP.terms.Resource });
      await accessor.writeDocument(resourceIdentifier, data, inputMetadata);

      const extraMetadata = new RepresentationMetadata(resourceIdentifier);
      extraMetadata.addQuad(namedNode('a'), namedNode('b'), namedNode('c'));
      await expect(accessor.writeMetadata(resourceIdentifier, extraMetadata)).resolves.toBeUndefined();

      const outputMetadata = await accessor.getMetadata(resourceIdentifier);
      expect(outputMetadata.quads(`${base}a`))
        .toStrictEqual([ quad(namedNode(`${base}a`), namedNode(`${base}b`), namedNode(`${base}c`)) ]);
    });
  });

  describe('deleting a resource', (): void => {
    it('throws a 404 if the identifier does not start with the base.', async(): Promise<void> => {
      await expect(accessor.deleteResource({ path: 'badpath' })).rejects.toThrow(NotFoundHttpError);
    });

    it('throws a 404 if the identifier does not match an existing entry.', async(): Promise<void> => {
      await expect(accessor.deleteResource({ path: `${base}resource` })).rejects.toThrow(NotFoundHttpError);
    });

    it('throws a 404 if it matches something that is no file or directory.', async(): Promise<void> => {
      cache.data = { resource: 5 };
      await expect(accessor.deleteResource({ path: `${base}resource` })).rejects.toThrow(NotFoundHttpError);
    });

    it('throws a 404 if the trailing slash does not match its type.', async(): Promise<void> => {
      cache.data = { resource: 'apple', container: {}};
      await expect(accessor.deleteResource({ path: `${base}resource/` })).rejects.toThrow(NotFoundHttpError);
      await expect(accessor.deleteResource({ path: `${base}container` })).rejects.toThrow(NotFoundHttpError);
    });

    it('deletes the corresponding file for document.', async(): Promise<void> => {
      cache.data = { resource: 'apple' };
      await expect(accessor.deleteResource({ path: `${base}resource` })).resolves.toBeUndefined();
      expect(cache.data.resource).toBeUndefined();
    });

    it('throws error if there is a problem with deleting existing metadata.', async(): Promise<void> => {
      cache.data = { resource: 'apple', 'resource.meta': {}};
      jest.requireMock('fs-extra').remove = (): any => {
        throw new Error('error');
      };
      await expect(accessor.deleteResource({ path: `${base}resource` })).rejects.toThrow('error');
    });

    it('removes the corresponding folder for containers.', async(): Promise<void> => {
      cache.data = { container: {}};
      await expect(accessor.deleteResource({ path: `${base}container/` })).resolves.toBeUndefined();
      expect(cache.data.container).toBeUndefined();
    });

    it('removes the corresponding metadata.', async(): Promise<void> => {
      cache.data = { container: { resource: 'apple', 'resource.meta': 'metaApple', '.meta': 'metadata' }};
      await expect(accessor.deleteResource({ path: `${base}container/resource` })).resolves.toBeUndefined();
      expect(cache.data.container.resource).toBeUndefined();
      expect(cache.data.container['resource.meta']).toBeUndefined();
      await expect(accessor.deleteResource({ path: `${base}container/` })).resolves.toBeUndefined();
      expect(cache.data.container).toBeUndefined();
    });

    it('can delete the root container.', async(): Promise<void> => {
      cache.data = {};
      await expect(accessor.deleteResource({ path: `${base}` })).resolves.toBeUndefined();
      expect(cache.data).toBeUndefined();
    });
  });
});
