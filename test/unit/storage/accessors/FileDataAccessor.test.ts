import 'jest-rdf';
import type { Readable } from 'stream';
import { namedNode } from '@rdfjs/data-model';
import type { Representation } from '../../../../src/ldp/representation/Representation';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';
import { FileDataAccessor } from '../../../../src/storage/accessors/FileDataAccessor';
import { ExtensionBasedMapper } from '../../../../src/storage/mapping/ExtensionBasedMapper';
import { APPLICATION_OCTET_STREAM } from '../../../../src/util/ContentTypes';
import { ConflictHttpError } from '../../../../src/util/errors/ConflictHttpError';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';
import type { SystemError } from '../../../../src/util/errors/SystemError';
import { UnsupportedMediaTypeHttpError } from '../../../../src/util/errors/UnsupportedMediaTypeHttpError';
import type { Guarded } from '../../../../src/util/GuardedStream';
import { guardedStreamFrom, readableToString } from '../../../../src/util/StreamUtil';
import { toLiteral } from '../../../../src/util/TermUtil';
import { CONTENT_TYPE, DC, LDP, POSIX, RDF, XSD } from '../../../../src/util/Vocabularies';
import { mockFs } from '../../../util/Util';

jest.mock('fs');

const rootFilePath = 'uploads';
const now = new Date();

describe('A FileDataAccessor', (): void => {
  const base = 'http://test.com/';
  let accessor: FileDataAccessor;
  let cache: { data: any };
  let metadata: RepresentationMetadata;
  let data: Guarded<Readable>;

  beforeEach(async(): Promise<void> => {
    cache = mockFs(rootFilePath, now);
    accessor = new FileDataAccessor(new ExtensionBasedMapper(base, rootFilePath));

    metadata = new RepresentationMetadata({ [CONTENT_TYPE]: APPLICATION_OCTET_STREAM });

    data = guardedStreamFrom([ 'data' ]);
  });

  it('can only handle binary data.', async(): Promise<void> => {
    await expect(accessor.canHandle({ binary: true } as Representation)).resolves.toBeUndefined();
    await expect(accessor.canHandle({ binary: false } as Representation)).rejects
      .toThrow(new UnsupportedMediaTypeHttpError('Only binary data is supported.'));
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
      jest.requireMock('fs').promises.lstat = (): any => {
        throw new Error('error');
      };
      await expect(accessor.getMetadata({ path: base })).rejects.toThrow(new Error('error'));
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
      expect(metadata.get(RDF.type)?.value).toBe(LDP.Resource);
      expect(metadata.get(POSIX.size)).toEqualRdfTerm(toLiteral('data'.length, XSD.terms.integer));
      expect(metadata.get(DC.modified)).toEqualRdfTerm(toLiteral(now.toISOString(), XSD.terms.dateTime));
      expect(metadata.get(POSIX.mtime)).toEqualRdfTerm(toLiteral(Math.floor(now.getTime() / 1000), XSD.terms.integer));
    });

    it('generates the metadata for a container and its non-meta children.', async(): Promise<void> => {
      cache.data = { container: { resource: 'data', 'resource.meta': 'metadata', notAFile: 5, container2: {}}};
      metadata = await accessor.getMetadata({ path: `${base}container/` });
      expect(metadata.identifier.value).toBe(`${base}container/`);
      expect(metadata.getAll(RDF.type)).toEqualRdfTermArray(
        [ LDP.terms.Container, LDP.terms.BasicContainer, LDP.terms.Resource ],
      );
      expect(metadata.get(POSIX.size)).toEqualRdfTerm(toLiteral(0, XSD.terms.integer));
      expect(metadata.get(DC.modified)).toEqualRdfTerm(toLiteral(now.toISOString(), XSD.terms.dateTime));
      expect(metadata.get(POSIX.mtime)).toEqualRdfTerm(toLiteral(Math.floor(now.getTime() / 1000), XSD.terms.integer));
      expect(metadata.getAll(LDP.contains)).toEqualRdfTermArray(
        [ namedNode(`${base}container/resource`), namedNode(`${base}container/container2/`) ],
      );

      const childQuads = metadata.quads().filter((quad): boolean =>
        quad.subject.value === `${base}container/resource`);
      const childMetadata = new RepresentationMetadata({ path: `${base}container/resource` }).addQuads(childQuads);
      expect(childMetadata.get(RDF.type)?.value).toBe(LDP.Resource);
      expect(childMetadata.get(POSIX.size)).toEqualRdfTerm(toLiteral('data'.length, XSD.terms.integer));
      expect(childMetadata.get(DC.modified)).toEqualRdfTerm(toLiteral(now.toISOString(), XSD.terms.dateTime));
      expect(childMetadata.get(POSIX.mtime)).toEqualRdfTerm(toLiteral(Math.floor(now.getTime() / 1000),
        XSD.terms.integer));
    });

    it('adds stored metadata when requesting metadata.', async(): Promise<void> => {
      cache.data = { resource: 'data', 'resource.meta': '<this> <is> <metadata>.' };
      metadata = await accessor.getMetadata({ path: `${base}resource` });
      expect(metadata.quads().some((quad): boolean => quad.subject.value === 'this')).toBe(true);

      cache.data = { container: { '.meta': '<this> <is> <metadata>.' }};
      metadata = await accessor.getMetadata({ path: `${base}container/` });
      expect(metadata.quads().some((quad): boolean => quad.subject.value === 'this')).toBe(true);
    });

    it('throws an error if there is a problem with the internal metadata.', async(): Promise<void> => {
      cache.data = { resource: 'data', 'resource.meta': 'invalid metadata!.' };
      await expect(accessor.getMetadata({ path: `${base}resource` })).rejects.toThrow();
    });
  });

  describe('writing a document', (): void => {
    it('throws a 404 if the identifier does not start with the base.', async(): Promise<void> => {
      await expect(accessor.writeDocument({ path: 'badpath' }, data, metadata))
        .rejects.toThrow(NotFoundHttpError);
    });

    it('throws an error when writing to a metadata path.', async(): Promise<void> => {
      await expect(accessor.writeDocument({ path: `${base}resource.meta` }, data, metadata))
        .rejects.toThrow(new ConflictHttpError('Not allowed to create files with the metadata extension.'));
    });

    it('writes the data to the corresponding file.', async(): Promise<void> => {
      await expect(accessor.writeDocument({ path: `${base}resource` }, data, metadata)).resolves.toBeUndefined();
      expect(cache.data.resource).toBe('data');
    });

    it('writes metadata to the corresponding metadata file.', async(): Promise<void> => {
      metadata = new RepresentationMetadata({ path: `${base}res.ttl` },
        { [CONTENT_TYPE]: 'text/turtle', likes: 'apples' });
      await expect(accessor.writeDocument({ path: `${base}res.ttl` }, data, metadata)).resolves.toBeUndefined();
      expect(cache.data['res.ttl']).toBe('data');
      expect(cache.data['res.ttl.meta']).toMatch(`<${base}res.ttl> <likes> "apples".`);
    });

    it('does not write metadata that is stored by the file system.', async(): Promise<void> => {
      metadata.add(RDF.type, LDP.terms.Resource);
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
      jest.requireMock('fs').promises.unlink = (): any => {
        throw new Error('error');
      };
      await expect(accessor.writeDocument({ path: `${base}resource` }, data, metadata))
        .rejects.toThrow(new Error('error'));
    });

    it('throws if something went wrong writing a file.', async(): Promise<void> => {
      data.read = (): any => {
        data.emit('error', new Error('error'));
        return null;
      };
      await expect(accessor.writeDocument({ path: `${base}resource` }, data, metadata))
        .rejects.toThrow(new Error('error'));
    });

    it('deletes the metadata file if something went wrong writing the file.', async(): Promise<void> => {
      data.read = (): any => {
        data.emit('error', new Error('error'));
        return null;
      };
      metadata.add('likes', 'apples');
      await expect(accessor.writeDocument({ path: `${base}resource` }, data, metadata))
        .rejects.toThrow(new Error('error'));
      expect(cache.data['resource.meta']).toBeUndefined();
    });

    it('updates the filename if the content-type gets updated.', async(): Promise<void> => {
      cache.data = { 'resource$.ttl': '<this> <is> <data>.', 'resource.meta': '<this> <is> <metadata>.' };
      metadata.identifier = namedNode(`${base}resource`);
      metadata.contentType = 'text/plain';
      metadata.add('new', 'metadata');
      await expect(accessor.writeDocument({ path: `${base}resource` }, data, metadata))
        .resolves.toBeUndefined();
      expect(cache.data).toEqual({
        'resource$.txt': 'data',
        'resource.meta': expect.stringMatching(`<${base}resource> <new> "metadata".`),
      });
    });

    it('does not try to update the content-type if there is no original file.', async(): Promise<void> => {
      metadata.identifier = namedNode(`${base}resource.txt`);
      metadata.contentType = 'text/turtle';
      metadata.add('new', 'metadata');
      await expect(accessor.writeDocument({ path: `${base}resource.txt` }, data, metadata))
        .resolves.toBeUndefined();
      expect(cache.data).toEqual({
        'resource.txt$.ttl': 'data',
        'resource.txt.meta': expect.stringMatching(`<${base}resource.txt> <new> "metadata".`),
      });
    });

    it('throws an error if there is an issue deleting the original file.', async(): Promise<void> => {
      cache.data = { 'resource$.ttl': '<this> <is> <data>.' };
      jest.requireMock('fs').promises.unlink = (): any => {
        const error = new Error('error') as SystemError;
        error.code = 'EISDIR';
        error.syscall = 'unlink';
        throw error;
      };

      metadata.contentType = 'text/plain';
      await expect(accessor.writeDocument({ path: `${base}resource` }, data, metadata))
        .rejects.toThrow(new Error('error'));
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
      jest.requireMock('fs').promises.mkdir = (): any => {
        throw new Error('error');
      };
      await expect(accessor.writeContainer({ path: base }, metadata)).rejects.toThrow(new Error('error'));
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
      await expect(accessor.deleteResource({ path: `${base}resource` })).rejects.toThrow();
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
      cache.data = { };
      await expect(accessor.deleteResource({ path: `${base}` })).resolves.toBeUndefined();
      expect(cache.data).toBeUndefined();
    });
  });
});
