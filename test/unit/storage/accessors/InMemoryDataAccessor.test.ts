import 'jest-rdf';
import type { Readable } from 'stream';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';
import { InMemoryDataAccessor } from '../../../../src/storage/accessors/InMemoryDataAccessor';
import { APPLICATION_OCTET_STREAM } from '../../../../src/util/ContentTypes';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';
import type { Guarded } from '../../../../src/util/GuardedStream';
import { guardedStreamFrom, readableToString } from '../../../../src/util/StreamUtil';
import { CONTENT_TYPE, LDP, RDF } from '../../../../src/util/UriConstants';
import { toCachedNamedNode } from '../../../../src/util/UriUtil';

describe('An InMemoryDataAccessor', (): void => {
  const base = 'http://test.com/';
  let accessor: InMemoryDataAccessor;
  let metadata: RepresentationMetadata;
  let data: Guarded<Readable>;

  beforeEach(async(): Promise<void> => {
    accessor = new InMemoryDataAccessor(base);

    // Create default root container
    await accessor.writeContainer({ path: `${base}` }, new RepresentationMetadata());

    metadata = new RepresentationMetadata({ [CONTENT_TYPE]: APPLICATION_OCTET_STREAM });

    data = guardedStreamFrom([ 'data' ]);
  });

  it('can only handle all data.', async(): Promise<void> => {
    await expect(accessor.canHandle()).resolves.toBeUndefined();
  });

  describe('reading and writing data', (): void => {
    it('throws a 404 if the identifier does not match an existing document.', async(): Promise<void> => {
      await expect(accessor.getData({ path: `${base}resource` })).rejects.toThrow(NotFoundHttpError);
      await expect(accessor.getData({ path: `${base}container/resource` })).rejects.toThrow(NotFoundHttpError);
    });

    it('throws a 404 if the identifier matches a container.', async(): Promise<void> => {
      await expect(accessor.getData({ path: base })).rejects.toThrow(NotFoundHttpError);
    });

    it('throws an error if part of the path matches a document.', async(): Promise<void> => {
      await expect(accessor.writeDocument({ path: `${base}resource` }, data, metadata)).resolves.toBeUndefined();
      await expect(accessor.getData({ path: `${base}resource/resource2` })).rejects.toThrow(new Error('Invalid path.'));
    });

    it('returns the corresponding data every time.', async(): Promise<void> => {
      await expect(accessor.writeDocument({ path: `${base}resource` }, data, metadata)).resolves.toBeUndefined();

      // Run twice to make sure the data is stored correctly
      await expect(readableToString(await accessor.getData({ path: `${base}resource` }))).resolves.toBe('data');
      await expect(readableToString(await accessor.getData({ path: `${base}resource` }))).resolves.toBe('data');
    });
  });

  describe('reading and writing metadata', (): void => {
    it('throws a 404 if the identifier does not match an existing document.', async(): Promise<void> => {
      await expect(accessor.getMetadata({ path: `${base}resource` })).rejects.toThrow(NotFoundHttpError);
    });

    it('throws a 404 if the trailing slash does not match its type.', async(): Promise<void> => {
      await expect(accessor.writeDocument({ path: `${base}resource` }, data, metadata)).resolves.toBeUndefined();
      await expect(accessor.getMetadata({ path: `${base}resource/` })).rejects.toThrow(NotFoundHttpError);
      await expect(accessor.writeContainer({ path: `${base}container/` }, metadata)).resolves.toBeUndefined();
      await expect(accessor.getMetadata({ path: `${base}container` })).rejects.toThrow(NotFoundHttpError);
    });

    it('returns empty metadata if there was none stored.', async(): Promise<void> => {
      metadata = new RepresentationMetadata();
      await expect(accessor.writeDocument({ path: `${base}resource` }, data, metadata)).resolves.toBeUndefined();
      metadata = await accessor.getMetadata({ path: `${base}resource` });
      expect(metadata.quads()).toHaveLength(0);
    });

    it('generates the containment metadata for a container.', async(): Promise<void> => {
      await expect(accessor.writeContainer({ path: `${base}container/` }, metadata)).resolves.toBeUndefined();
      await expect(accessor.writeDocument({ path: `${base}container/resource` }, data, metadata))
        .resolves.toBeUndefined();
      await expect(accessor.writeContainer({ path: `${base}container/container2` }, metadata)).resolves.toBeUndefined();
      metadata = await accessor.getMetadata({ path: `${base}container/` });
      expect(metadata.getAll(LDP.contains)).toEqualRdfTermArray(
        [ toCachedNamedNode(`${base}container/resource`), toCachedNamedNode(`${base}container/container2/`) ],
      );
    });

    it('adds stored metadata when requesting document metadata.', async(): Promise<void> => {
      const identifier = { path: `${base}resource` };
      const inputMetadata = new RepresentationMetadata(identifier, { [RDF.type]: toCachedNamedNode(LDP.Resource) });
      await expect(accessor.writeDocument(identifier, data, inputMetadata)).resolves.toBeUndefined();
      metadata = await accessor.getMetadata(identifier);
      expect(metadata.identifier.value).toBe(`${base}resource`);
      const quads = metadata.quads();
      expect(quads).toHaveLength(1);
      expect(quads[0].object.value).toBe(LDP.Resource);
    });

    it('adds stored metadata when requesting container metadata.', async(): Promise<void> => {
      const identifier = { path: `${base}container/` };
      const inputMetadata = new RepresentationMetadata(identifier, { [RDF.type]: toCachedNamedNode(LDP.Container) });
      await expect(accessor.writeContainer(identifier, inputMetadata)).resolves.toBeUndefined();

      metadata = await accessor.getMetadata(identifier);
      expect(metadata.identifier.value).toBe(`${base}container/`);
      const quads = metadata.quads();
      expect(quads).toHaveLength(1);
      expect(quads[0].object.value).toBe(LDP.Container);
    });

    it('can overwrite the metadata of an existing container without overwriting children.', async(): Promise<void> => {
      const identifier = { path: `${base}container/` };
      const inputMetadata = new RepresentationMetadata(identifier, { [RDF.type]: toCachedNamedNode(LDP.Container) });
      await expect(accessor.writeContainer(identifier, inputMetadata)).resolves.toBeUndefined();
      const resourceMetadata = new RepresentationMetadata();
      await expect(accessor.writeDocument(
        { path: `${base}container/resource` }, data, resourceMetadata,
      )).resolves.toBeUndefined();

      const newMetadata = new RepresentationMetadata(inputMetadata);
      newMetadata.add(RDF.type, toCachedNamedNode(LDP.BasicContainer));
      await expect(accessor.writeContainer(identifier, newMetadata)).resolves.toBeUndefined();

      metadata = await accessor.getMetadata(identifier);
      expect(metadata.identifier.value).toBe(`${base}container/`);
      const quads = metadata.quads();
      expect(quads).toHaveLength(3);
      expect(metadata.getAll(RDF.type).map((term): string => term.value))
        .toEqual([ LDP.Container, LDP.BasicContainer ]);
      expect(metadata.get(LDP.contains)?.value).toEqual(`${base}container/resource`);

      await expect(accessor.getMetadata({ path: `${base}container/resource` }))
        .resolves.toBeInstanceOf(RepresentationMetadata);
      expect(await readableToString(await accessor.getData({ path: `${base}container/resource` }))).toBe('data');
    });

    it('can write to the root container without overriding its children.', async(): Promise<void> => {
      const identifier = { path: `${base}` };
      const inputMetadata = new RepresentationMetadata(identifier, { [RDF.type]: toCachedNamedNode(LDP.Container) });
      await expect(accessor.writeContainer(identifier, inputMetadata)).resolves.toBeUndefined();
      const resourceMetadata = new RepresentationMetadata();
      await expect(accessor.writeDocument(
        { path: `${base}resource` }, data, resourceMetadata,
      )).resolves.toBeUndefined();

      metadata = await accessor.getMetadata(identifier);
      expect(metadata.identifier.value).toBe(`${base}`);
      const quads = metadata.quads();
      expect(quads).toHaveLength(2);
      expect(metadata.getAll(RDF.type)).toHaveLength(1);
      expect(metadata.getAll(LDP.contains)).toHaveLength(1);

      await expect(accessor.getMetadata({ path: `${base}resource` }))
        .resolves.toBeInstanceOf(RepresentationMetadata);
      expect(await readableToString(await accessor.getData({ path: `${base}resource` }))).toBe('data');
    });

    it('errors when writing to an invalid container path..', async(): Promise<void> => {
      await expect(accessor.writeDocument({ path: `${base}resource` }, data, metadata)).resolves.toBeUndefined();

      await expect(accessor.writeContainer({ path: `${base}resource/container` }, metadata))
        .rejects.toThrow(new Error('Invalid path.'));
    });
  });

  describe('deleting a resource', (): void => {
    it('throws a 404 if the identifier does not match an existing entry.', async(): Promise<void> => {
      await expect(accessor.deleteResource({ path: `${base}resource` })).rejects.toThrow(NotFoundHttpError);
    });

    it('removes the corresponding resource.', async(): Promise<void> => {
      await expect(accessor.writeDocument({ path: `${base}resource` }, data, metadata)).resolves.toBeUndefined();
      await expect(accessor.writeContainer({ path: `${base}container/` }, metadata)).resolves.toBeUndefined();
      await expect(accessor.deleteResource({ path: `${base}resource` })).resolves.toBeUndefined();
      await expect(accessor.deleteResource({ path: `${base}container/` })).resolves.toBeUndefined();
      await expect(accessor.getMetadata({ path: `${base}resource` })).rejects.toThrow(NotFoundHttpError);
      await expect(accessor.getMetadata({ path: `${base}container/` })).rejects.toThrow(NotFoundHttpError);
    });

    it('can delete the root container and write to it again.', async(): Promise<void> => {
      await expect(accessor.deleteResource({ path: `${base}` })).resolves.toBeUndefined();
      await expect(accessor.getMetadata({ path: `${base}` })).rejects.toThrow(NotFoundHttpError);
      await expect(accessor.getMetadata({ path: `${base}test/` })).rejects.toThrow(NotFoundHttpError);
      await expect(accessor.writeContainer({ path: `${base}` }, metadata)).resolves.toBeUndefined();
      const resultMetadata = await accessor.getMetadata({ path: `${base}` });
      expect(resultMetadata.quads()).toBeRdfIsomorphic(metadata.quads());
    });
  });
});
