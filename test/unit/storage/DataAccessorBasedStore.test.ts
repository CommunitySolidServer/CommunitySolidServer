import 'jest-rdf';
import type { Readable } from 'stream';
import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'n3';
import { readableToQuads } from '../../../dist';
import type { RepresentationPreferences } from '../../../src';
import { RdfToQuadConverter, serializeQuads } from '../../../src';
import type { AuxiliaryStrategy } from '../../../src/http/auxiliary/AuxiliaryStrategy';
import { BasicRepresentation } from '../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../../src/http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import type { DataAccessor } from '../../../src/storage/accessors/DataAccessor';
import { BasicConditions } from '../../../src/storage/BasicConditions';
import { DataAccessorBasedStore } from '../../../src/storage/DataAccessorBasedStore';
import { INTERNAL_QUADS, TEXT_TURTLE } from '../../../src/util/ContentTypes';
import { BadRequestHttpError } from '../../../src/util/errors/BadRequestHttpError';
import { ConflictHttpError } from '../../../src/util/errors/ConflictHttpError';
import { ForbiddenHttpError } from '../../../src/util/errors/ForbiddenHttpError';
import { MethodNotAllowedHttpError } from '../../../src/util/errors/MethodNotAllowedHttpError';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../../../src/util/errors/NotImplementedHttpError';
import { PreconditionFailedHttpError } from '../../../src/util/errors/PreconditionFailedHttpError';
import type { Guarded } from '../../../src/util/GuardedStream';
import { SingleRootIdentifierStrategy } from '../../../src/util/identifiers/SingleRootIdentifierStrategy';
import { trimTrailingSlashes } from '../../../src/util/PathUtil';
import { guardedStreamFrom } from '../../../src/util/StreamUtil';
import { CONTENT_TYPE, SOLID_HTTP, LDP, PIM, RDF, SOLID_META, DC } from '../../../src/util/Vocabularies';
import { SimpleSuffixStrategy } from '../../util/SimpleSuffixStrategy';
const { namedNode, quad } = DataFactory;

const GENERATED_PREDICATE = namedNode('generated');

class SimpleDataAccessor implements DataAccessor {
  public readonly data: Record<string, Representation> = {};

  private checkExists(identifier: ResourceIdentifier): void {
    if (!this.data[identifier.path]) {
      throw new NotFoundHttpError();
    }
  }

  public async canHandle(representation: Representation): Promise<void> {
    if (!representation.binary) {
      throw new BadRequestHttpError();
    }
  }

  public async deleteResource(identifier: ResourceIdentifier): Promise<void> {
    this.checkExists(identifier);
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.data[identifier.path];
  }

  public async getData(identifier: ResourceIdentifier): Promise<Guarded<Readable>> {
    this.checkExists(identifier);
    return this.data[identifier.path].data;
  }

  public async getMetadata(identifier: ResourceIdentifier): Promise<RepresentationMetadata> {
    this.checkExists(identifier);
    const metadata = new RepresentationMetadata(this.data[identifier.path].metadata);
    metadata.add(GENERATED_PREDICATE, 'data', SOLID_META.terms.ResponseMetadata);
    return metadata;
  }

  public async writeMetadata(identifier: ResourceIdentifier, metadata: RepresentationMetadata): Promise<void> {
    this.checkExists({ path: metadata.identifier.value });
    this.data[metadata.identifier.value].metadata = metadata;
  }

  public async* getChildren(identifier: ResourceIdentifier): AsyncIterableIterator<RepresentationMetadata> {
    // Find all keys that look like children of the container
    const children = Object.keys(this.data).filter((name): boolean =>
      name.startsWith(identifier.path) &&
      name.length > identifier.path.length &&
      !trimTrailingSlashes(name.slice(identifier.path.length)).includes('/'));
    yield* children.map((name): RepresentationMetadata => new RepresentationMetadata({ path: name }));
  }

  public async modifyResource(): Promise<void> {
    throw new Error('modify');
  }

  public async writeContainer(identifier: ResourceIdentifier, metadata?: RepresentationMetadata): Promise<void> {
    this.data[identifier.path] = { metadata } as Representation;
  }

  public async writeDocument(identifier: ResourceIdentifier, data: Readable, metadata?: RepresentationMetadata):
  Promise<void> {
    this.data[identifier.path] = { data, metadata } as Representation;
  }
}

describe('A DataAccessorBasedStore', (): void => {
  const now = new Date(2020, 5, 12);
  const later = new Date(2021, 6, 13);
  let mockDate: jest.SpyInstance;
  let store: DataAccessorBasedStore;
  let accessor: SimpleDataAccessor;
  const root = 'http://test.com/';
  const identifierStrategy = new SingleRootIdentifierStrategy(root);
  let auxiliaryStrategy: AuxiliaryStrategy;
  let containerMetadata: RepresentationMetadata;
  let representation: Representation;
  const resourceData = 'text';

  beforeEach(async(): Promise<void> => {
    mockDate = jest.spyOn(global, 'Date').mockReturnValue(now as any);

    accessor = new SimpleDataAccessor();

    auxiliaryStrategy = new SimpleSuffixStrategy('.dummy');
    const metadataStrategy = new SimpleSuffixStrategy('.meta');
    const converter = new RdfToQuadConverter();
    store = new DataAccessorBasedStore({
      accessor, identifierStrategy, auxiliaryStrategy, metadataStrategy, converter,
    });

    containerMetadata = new RepresentationMetadata(
      { [RDF.type]: [
        DataFactory.namedNode(LDP.Resource),
        DataFactory.namedNode(LDP.Container),
        DataFactory.namedNode(LDP.BasicContainer),
      ]},
    );
    const rootMetadata = new RepresentationMetadata(containerMetadata);
    rootMetadata.identifier = namedNode(root);
    accessor.data[root] = { metadata: rootMetadata } as Representation;

    representation = {
      binary: true,
      data: guardedStreamFrom([ resourceData ]),
      metadata: new RepresentationMetadata(
        { [CONTENT_TYPE]: 'text/plain', [RDF.type]: DataFactory.namedNode(LDP.Resource) },
      ),
      isEmpty: false,
    };
  });

  describe('getting a Representation', (): void => {
    it('will 404 if the identifier does not contain the root.', async(): Promise<void> => {
      await expect(store.getRepresentation({ path: 'verybadpath' })).rejects.toThrow(NotFoundHttpError);
    });

    it('will return the stored representation for resources.', async(): Promise<void> => {
      const resourceID = { path: `${root}resource` };
      representation.metadata.identifier = DataFactory.namedNode(resourceID.path);
      accessor.data[resourceID.path] = representation;
      const result = await store.getRepresentation(resourceID);
      expect(result).toMatchObject({ binary: true });
      expect(await arrayifyStream(result.data)).toEqual([ resourceData ]);
      expect(result.metadata.contentType).toBe('text/plain');
      expect(result.metadata.get('AUXILIARY')?.value).toBe(auxiliaryStrategy.getAuxiliaryIdentifier(resourceID).path);
    });

    it('will return a data stream that matches the metadata for containers.', async(): Promise<void> => {
      const resourceID = { path: `${root}container/` };
      containerMetadata.identifier = namedNode(resourceID.path);
      accessor.data[resourceID.path] = { metadata: containerMetadata } as Representation;
      const metaMirror = new RepresentationMetadata(containerMetadata);
      // Generated metadata will have its graph removed
      metaMirror.add(GENERATED_PREDICATE, 'data');
      await auxiliaryStrategy.addMetadata(metaMirror);
      const result = await store.getRepresentation(resourceID);
      expect(result).toMatchObject({ binary: false });
      expect(await arrayifyStream(result.data)).toBeRdfIsomorphic(metaMirror.quads());
      expect(result.metadata.contentType).toEqual(INTERNAL_QUADS);
      expect(result.metadata.get('AUXILIARY')?.value).toBe(auxiliaryStrategy.getAuxiliaryIdentifier(resourceID).path);
    });

    it('will remove containment triples referencing auxiliary resources.', async(): Promise<void> => {
      const resourceID = { path: `${root}container/` };
      containerMetadata.identifier = namedNode(resourceID.path);
      accessor.data[resourceID.path] = { metadata: containerMetadata } as Representation;
      accessor.data[`${resourceID.path}.dummy`] = representation;
      accessor.data[`${resourceID.path}resource`] = representation;
      accessor.data[`${resourceID.path}resource.dummy`] = representation;
      const result = await store.getRepresentation(resourceID);
      const contains = result.metadata.getAll(LDP.terms.contains);
      expect(contains).toHaveLength(1);
      expect(contains[0].value).toBe(`${resourceID.path}resource`);
    });

    it('will return the stored representation for metadata resources.', async(): Promise<void> => {
      const resourceID = { path: `${root}resource` };
      const metaResourceID = { path: `${root}resource.meta` };
      representation.metadata.identifier = DataFactory.namedNode(resourceID.path);

      accessor.data[resourceID.path] = representation;

      const result = await store.getRepresentation(metaResourceID);
      expect(result).toMatchObject({ binary: true });
      expect(await arrayifyStream(result.data)).toEqual(
        [ '<http://test.com/resource> <http://www.w3.org/ns/ma-ont#format> "text/plain"',
          ';\n    a <http://www.w3.org/ns/ldp#Resource>',
          '.\n' ],
      );
      expect(result.metadata.contentType).toBe(TEXT_TURTLE);
    });

    it('will return the generated representation for container metadata resources.', async(): Promise<void> => {
      const metaResourceID = { path: `${root}.meta` };

      // Add resource to root
      const resourceID = { path: `${root}resource` };
      accessor.data[resourceID.path] = representation;

      const result = await store.getRepresentation(metaResourceID);
      const converter = new RdfToQuadConverter();
      const preferences: RepresentationPreferences = { type: { [INTERNAL_QUADS]: 1 }};
      const resultConverted = await converter.handle(
        { identifier: metaResourceID, representation: result, preferences },
      );
      const resultStore = await readableToQuads(resultConverted.data);
      expect(resultStore).toBeRdfDatasetContaining(
        quad(namedNode(root), namedNode(LDP.contains), namedNode(resourceID.path)),
      );
      expect(result.metadata.contentType).toBe(TEXT_TURTLE);
    });
  });

  describe('adding a Resource', (): void => {
    it('will 404 if the identifier does not contain the root.', async(): Promise<void> => {
      await expect(store.addResource({ path: 'verybadpath' }, representation))
        .rejects.toThrow(NotFoundHttpError);
    });

    it('will 404 if the target does not exist.', async(): Promise<void> => {
      const resourceID = { path: `${root}container/` };
      await expect(store.addResource(resourceID, representation)).rejects.toThrow(NotFoundHttpError);
    });

    it('will error if it gets a non-404 error when reading the container.', async(): Promise<void> => {
      const resourceID = { path: `${root}container` };
      accessor.getMetadata = async(): Promise<any> => {
        throw new Error('randomError');
      };
      await expect(store.addResource(resourceID, representation)).rejects.toThrow('randomError');
    });

    it('does not allow adding resources to existing non-containers.', async(): Promise<void> => {
      const resourceID = { path: `${root}resource/` };
      accessor.data[resourceID.path] = representation;
      const result = store.addResource(resourceID, representation);
      await expect(result).rejects.toThrow(MethodNotAllowedHttpError);
      await expect(result).rejects.toThrow('The given path is not a container.');
    });

    it('checks if the DataAccessor supports the data.', async(): Promise<void> => {
      const resourceID = { path: root };
      representation.binary = false;
      await expect(store.addResource(resourceID, representation)).rejects.toThrow(BadRequestHttpError);
      await expect(store.addResource(resourceID, representation)).rejects
        .toThrow('The given input is not supported by the server configuration.');
    });

    it('throws a 412 if the conditions are not matched.', async(): Promise<void> => {
      const resourceID = { path: root };
      const conditions = new BasicConditions({ notMatchesETag: [ '*' ]});
      await expect(store.addResource(resourceID, representation, conditions))
        .rejects.toThrow(PreconditionFailedHttpError);
    });

    it('Ignores the content when trying to create a container when the data is not empty.', async(): Promise<void> => {
      const resourceID = { path: root };
      representation.metadata.add(RDF.type, LDP.terms.Container);
      representation.isEmpty = false;
      const result = await store.addResource(resourceID, representation);
      expect(result).toEqual({
        path: expect.stringMatching(new RegExp(`^${root}[^/]+/$`, 'u')),
      });
      expect(accessor.data[result.path].data).toBeUndefined();
    });

    it('can write resources.', async(): Promise<void> => {
      const resourceID = { path: root };
      representation.metadata.removeAll(RDF.type);
      const result = await store.addResource(resourceID, representation);
      expect(result).toEqual({
        path: expect.stringMatching(new RegExp(`^${root}[^/]+$`, 'u')),
      });
      await expect(arrayifyStream(accessor.data[result.path].data)).resolves.toEqual([ resourceData ]);
      expect(accessor.data[result.path].metadata.get(DC.terms.modified)?.value).toBe(now.toISOString());
    });

    it('can write containers.', async(): Promise<void> => {
      const resourceID = { path: root };
      representation.metadata.add(RDF.type, LDP.terms.Container);
      const result = await store.addResource(resourceID, representation);
      expect(result).toEqual({
        path: expect.stringMatching(new RegExp(`^${root}[^/]+/$`, 'u')),
      });
      expect(accessor.data[result.path]).toBeTruthy();
      expect(accessor.data[result.path].metadata.contentType).toBeUndefined();

      const { metadata } = await store.getRepresentation(result);
      expect(metadata.get(DC.terms.modified)?.value).toBe(now.toISOString());
    });

    it('creates a URI based on the incoming slug.', async(): Promise<void> => {
      const resourceID = { path: root };
      representation.metadata.removeAll(RDF.type);
      representation.metadata.add(SOLID_HTTP.slug, 'newName');
      const result = await store.addResource(resourceID, representation);
      expect(result).toEqual({
        path: `${root}newName`,
      });
    });

    it('errors on a slug ending on / without Link rel:type Container header.', async(): Promise<void> => {
      const resourceID = { path: root };
      representation.metadata.removeAll(RDF.type);
      representation.metadata.add(SOLID_HTTP.slug, 'noContainer/');
      representation.data = guardedStreamFrom([ `` ]);
      const result = store.addResource(resourceID, representation);

      await expect(result).rejects.toThrow(BadRequestHttpError);
      await expect(result).rejects
        .toThrow('Only slugs used to create containers can end with a `/`.');
    });

    it('creates a URI when the incoming slug does not end with /, ' +
      'but has a Link rel:type Container header.', async(): Promise<void> => {
      const resourceID = { path: root };
      representation.metadata.removeAll(RDF.type);
      representation.metadata.add(RDF.type, LDP.terms.Container);
      representation.metadata.add(SOLID_HTTP.slug, 'newContainer');
      representation.data = guardedStreamFrom([ `` ]);
      const result = await store.addResource(resourceID, representation);
      expect(result).toEqual({
        path: `${root}newContainer/`,
      });
    });

    it('generates a new URI if adding the slug would create an existing URI.', async(): Promise<void> => {
      const resourceID = { path: root };
      representation.metadata.add(SOLID_HTTP.slug, 'newName');
      accessor.data[`${root}newName`] = representation;
      const result = await store.addResource(resourceID, representation);
      expect(result).not.toEqual({
        path: `${root}newName`,
      });
      expect(result).not.toEqual({
        path: expect.stringMatching(new RegExp(`^${root}[^/]+/$`, 'u')),
      });
    });

    it('generates http://test.com/%26%26 when slug is &%26.', async(): Promise<void> => {
      const resourceID = { path: root };
      representation.metadata.removeAll(RDF.type);
      representation.metadata.add(SOLID_HTTP.slug, '&%26');
      const result = await store.addResource(resourceID, representation);
      expect(result).toEqual({ path: `${root}%26%26` });
    });

    it('errors if the slug contains a slash.', async(): Promise<void> => {
      const resourceID = { path: root };
      representation.metadata.removeAll(RDF.type);
      representation.data = guardedStreamFrom([ `` ]);
      representation.metadata.add(SOLID_HTTP.slug, 'sla/sh/es');
      const result = store.addResource(resourceID, representation);
      await expect(result).rejects.toThrow(BadRequestHttpError);
      await expect(result).rejects.toThrow('Slugs should not contain slashes');
    });

    it('errors if the slug would cause an auxiliary resource URI to be generated.', async(): Promise<void> => {
      const resourceID = { path: root };
      representation.metadata.removeAll(RDF.type);
      representation.metadata.add(SOLID_HTTP.slug, 'test.dummy');
      const result = store.addResource(resourceID, representation);
      await expect(result).rejects.toThrow(ForbiddenHttpError);
      await expect(result).rejects.toThrow('Slug bodies that would result in an auxiliary resource are forbidden');
    });
  });

  describe('setting a Representation', (): void => {
    it('will 404 if the identifier does not contain the root.', async(): Promise<void> => {
      await expect(store.setRepresentation({ path: 'verybadpath' }, representation))
        .rejects.toThrow(NotFoundHttpError);
    });

    it('checks if the DataAccessor supports the data.', async(): Promise<void> => {
      const resourceID = { path: `${root}container/` };
      await expect(store.setRepresentation(resourceID, representation)).resolves.toStrictEqual(
        [{ path: root }, { path: `${root}container/` }],
      );
    });

    it('will error if the path has a different slash than the existing one.', async(): Promise<void> => {
      const resourceID = { path: `${root}resource` };
      accessor.data[`${resourceID.path}/`] = representation;
      representation.metadata.identifier = DataFactory.namedNode(`${resourceID.path}/`);
      const prom = store.setRepresentation(resourceID, representation);
      await expect(prom).rejects.toThrow(`${resourceID.path} conflicts with existing path ${resourceID.path}/`);
      await expect(prom).rejects.toThrow(ConflictHttpError);
    });

    it('throws a 412 if the conditions are not matched.', async(): Promise<void> => {
      const resourceID = { path: `${root}resource` };
      await store.setRepresentation(resourceID, representation);
      const conditions = new BasicConditions({ notMatchesETag: [ '*' ]});
      await expect(store.setRepresentation(resourceID, representation, conditions))
        .rejects.toThrow(PreconditionFailedHttpError);
    });

    // As discussed in #475, trimming the trailing slash of a root container in getNormalizedMetadata
    // can result in undefined behaviour since there is no parent container.
    it('will not trim the slash of root containers since there is no parent.', async(): Promise<void> => {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete accessor.data[root];

      const mock = jest.spyOn(accessor, 'getMetadata');

      const resourceID = { path: `${root}` };
      representation.metadata.removeAll(RDF.type);
      representation.metadata.contentType = 'text/turtle';
      representation.data = guardedStreamFrom([ `<${root}> a <coolContainer>.` ]);
      await expect(store.setRepresentation(resourceID, representation)).resolves
        .toEqual([{ path: `${root}` }]);
      expect(mock).toHaveBeenCalledTimes(1);
      expect(mock).toHaveBeenLastCalledWith(resourceID);

      mock.mockRestore();
    });

    it('will error if path does not end in slash and does not match its resource type.', async(): Promise<void> => {
      const resourceID = { path: `${root}resource` };
      representation.metadata.add(RDF.type, LDP.terms.Container);
      await expect(store.setRepresentation(resourceID, representation)).rejects.toThrow(
        new BadRequestHttpError('Containers should have a `/` at the end of their path, resources should not.'),
      );
    });

    it('succeeds when trying to create a container with non-RDF data +' +
        'since the data will be ignored.', async(): Promise<void> => {
      const resourceID = { path: `${root}container/` };
      representation.metadata.add(RDF.type, LDP.terms.Container);
      await expect(store.setRepresentation(resourceID, representation)).resolves.toStrictEqual(
        [{ path: root }, { path: `${root}container/` }],
      );
    });

    it('errors when trying to create an auxiliary resource with invalid data.', async(): Promise<void> => {
      const resourceID = { path: `${root}resource.dummy` };
      auxiliaryStrategy.validate = jest.fn().mockRejectedValue(new Error('bad data!'));
      await expect(store.setRepresentation(resourceID, representation)).rejects.toThrow('bad data!');
    });

    it('can write resources.', async(): Promise<void> => {
      const resourceID = { path: `${root}resource` };
      await expect(store.setRepresentation(resourceID, representation)).resolves.toEqual([
        { path: root },
        { path: `${root}resource` },
      ]);
      await expect(arrayifyStream(accessor.data[resourceID.path].data)).resolves.toEqual([ resourceData ]);
      expect(accessor.data[resourceID.path].metadata.get(DC.terms.modified)?.value).toBe(now.toISOString());
      expect(accessor.data[root].metadata.get(DC.terms.modified)?.value).toBe(now.toISOString());
      expect(accessor.data[root].metadata.get(GENERATED_PREDICATE)).toBeUndefined();
    });

    it('can write containers.', async(): Promise<void> => {
      const resourceID = { path: `${root}container/` };

      // Generate based on URI
      representation.metadata.removeAll(RDF.type);
      representation.metadata.contentType = 'text/turtle';
      representation.data = guardedStreamFrom([ `<${root}resource/> a <coolContainer>.` ]);
      await expect(store.setRepresentation(resourceID, representation)).resolves.toEqual([
        { path: root },
        { path: `${root}container/` },
      ]);
      expect(accessor.data[resourceID.path]).toBeTruthy();
      expect(accessor.data[resourceID.path].metadata.contentType).toBeUndefined();
      expect(accessor.data[resourceID.path].metadata.get(DC.terms.modified)?.value).toBe(now.toISOString());
      expect(accessor.data[root].metadata.get(DC.terms.modified)?.value).toBe(now.toISOString());
      expect(accessor.data[root].metadata.get(GENERATED_PREDICATE)).toBeUndefined();
    });

    it('can overwrite resources which does not update parent metadata.', async(): Promise<void> => {
      const resourceID = { path: `${root}resource` };
      await expect(store.setRepresentation(resourceID, representation)).resolves.toEqual([
        { path: root },
        { path: `${root}resource` },
      ]);
      await expect(arrayifyStream(accessor.data[resourceID.path].data)).resolves.toEqual([ resourceData ]);
      expect(accessor.data[resourceID.path].metadata.get(DC.terms.modified)?.value).toBe(now.toISOString());
      expect(accessor.data[root].metadata.get(DC.terms.modified)?.value).toBe(now.toISOString());

      // Parent metadata does not get updated if the resource already exists
      representation = new BasicRepresentation('updatedText', 'text/plain');
      mockDate.mockReturnValue(later);
      await expect(store.setRepresentation(resourceID, representation)).resolves.toEqual([
        { path: `${root}resource` },
      ]);
      await expect(arrayifyStream(accessor.data[resourceID.path].data)).resolves.toEqual([ 'updatedText' ]);
      expect(accessor.data[resourceID.path].metadata.get(DC.terms.modified)?.value).toBe(later.toISOString());
      expect(accessor.data[root].metadata.get(DC.terms.modified)?.value).toBe(now.toISOString());
      mockDate.mockReturnValue(now);
    });

    it('does not write generated metadata.', async(): Promise<void> => {
      const resourceID = { path: `${root}resource` };
      representation.metadata.add('notGen', 'value');
      representation.metadata.add('gen', 'value', SOLID_META.terms.ResponseMetadata);
      await expect(store.setRepresentation(resourceID, representation)).resolves.toEqual([
        { path: root },
        { path: `${root}resource` },
      ]);
      await expect(arrayifyStream(accessor.data[resourceID.path].data)).resolves.toEqual([ resourceData ]);
      expect(accessor.data[resourceID.path].metadata.get('notGen')?.value).toBe('value');
      expect(accessor.data[resourceID.path].metadata.get('gen')).toBeUndefined();
    });

    it('can write resources even if root does not exist.', async(): Promise<void> => {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete accessor.data[root];
      const resourceID = { path: `${root}resource` };
      await expect(store.setRepresentation(resourceID, representation)).resolves.toEqual([
        { path: `${root}` },
        { path: `${root}resource` },
      ]);
      await expect(arrayifyStream(accessor.data[resourceID.path].data)).resolves.toEqual([ resourceData ]);
    });

    it('creates recursive containers when needed.', async(): Promise<void> => {
      const resourceID = { path: `${root}a/b/resource` };
      await expect(store.setRepresentation(resourceID, representation)).resolves.toEqual([
        { path: `${root}a/` },
        { path: `${root}a/b/` },
        { path: `${root}a/b/resource` },
      ]);
      await expect(arrayifyStream(accessor.data[resourceID.path].data)).resolves.toEqual([ resourceData ]);
      expect(accessor.data[`${root}a/`].metadata.getAll(RDF.type).map((type): string => type.value))
        .toContain(LDP.Container);
      expect(accessor.data[`${root}a/b/`].metadata.getAll(RDF.type).map((type): string => type.value))
        .toContain(LDP.Container);
    });

    it('errors when a recursive container overlaps with an existing resource.', async(): Promise<void> => {
      const resourceID = { path: `${root}a/b/resource` };
      accessor.data[`${root}a`] = representation;
      const prom = store.setRepresentation(resourceID, representation);
      await expect(prom).rejects.toThrow(`Creating container ${root}a/ conflicts with an existing resource.`);
      await expect(prom).rejects.toThrow(ForbiddenHttpError);
    });

    it('can write to root if it does not exist.', async(): Promise<void> => {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete accessor.data[root];
      const resourceID = { path: `${root}` };

      // Generate based on URI
      representation.metadata.removeAll(RDF.type);
      representation.metadata.contentType = 'text/turtle';
      representation.data = guardedStreamFrom([]);
      await expect(store.setRepresentation(resourceID, representation)).resolves.toEqual([
        { path: `${root}` },
      ]);
      expect(accessor.data[resourceID.path]).toBeTruthy();
      expect(Object.keys(accessor.data)).toHaveLength(1);
      expect(accessor.data[resourceID.path].metadata.contentType).toBeUndefined();
    });

    it('can write to metadata resource.', async(): Promise<void> => {
      const resourceID = { path: `${root}resource` };
      const metaResourceID = { path: `${root}resource.meta` };

      accessor.data[resourceID.path] = representation;
      const metaRepresentation = new BasicRepresentation([ quad(
        DataFactory.namedNode(resourceID.path),
        DataFactory.namedNode(DC.description),
        DataFactory.literal('something'),
      ) ], resourceID);

      await expect(store.setRepresentation(metaResourceID, metaRepresentation)).resolves.toEqual([ metaResourceID ]);
      expect(accessor.data[resourceID.path].metadata.quads()).toBeRdfIsomorphic([
        quad(
          DataFactory.namedNode(resourceID.path),
          DataFactory.namedNode(DC.description),
          DataFactory.literal('something'),
        ),
      ]);
    });

    it('can write to metadata resource when using Readable as representation data.', async(): Promise<void> => {
      const resourceID = { path: `${root}resource` };
      const metaResourceID = { path: `${root}resource.meta` };

      accessor.data[resourceID.path] = representation;
      const readable = serializeQuads([ quad(
        DataFactory.namedNode(resourceID.path),
        DataFactory.namedNode(DC.description),
        DataFactory.literal('something'),
      ) ], TEXT_TURTLE);
      const metaRepresentation = new BasicRepresentation(readable, resourceID);
      metaRepresentation.metadata.contentType = TEXT_TURTLE;

      await expect(store.setRepresentation(metaResourceID, metaRepresentation)).resolves.toEqual([ metaResourceID ]);
      expect(accessor.data[resourceID.path].metadata.quads()).toBeRdfIsomorphic([
        quad(
          DataFactory.namedNode(resourceID.path),
          DataFactory.namedNode(DC.description),
          DataFactory.literal('something'),
        ),
      ]);
    });

    it('can not write to metadata resource when corresponding resource does not exist.', async(): Promise<void> => {
      const metaResourceID = { path: `${root}resource.meta` };
      await expect(store.setRepresentation(metaResourceID, representation)).rejects.toThrow(ConflictHttpError);
    });

    it('can not write to metadata resource of a metadata resource.', async(): Promise<void> => {
      const metametaResourceID = { path: `${root}resource.meta.meta` };
      const resourceID = { path: `${root}resource` };

      accessor.data[resourceID.path] = representation;
      await expect(store.setRepresentation(metametaResourceID, representation)).rejects.toThrow(ConflictHttpError);
    });
  });

  describe('modifying a Representation', (): void => {
    it('throws a 412 if the conditions are not matched.', async(): Promise<void> => {
      const resourceID = { path: root };
      const conditions = new BasicConditions({ notMatchesETag: [ '*' ]});
      await expect(store.modifyResource(resourceID, representation, conditions))
        .rejects.toThrow(PreconditionFailedHttpError);
    });

    it('throws a 412 if the conditions are not matched on resources that do not exist.', async(): Promise<void> => {
      const resourceID = { path: `${root}notHere` };
      const conditions = new BasicConditions({ matchesETag: [ '*' ]});
      await expect(store.modifyResource(resourceID, representation, conditions))
        .rejects.toThrow(PreconditionFailedHttpError);
    });

    it('re-throws the error if something goes wrong accessing the metadata.', async(): Promise<void> => {
      accessor.getMetadata = jest.fn(async(): Promise<any> => {
        throw new Error('error');
      });

      const resourceID = { path: root };
      const conditions = new BasicConditions({ notMatchesETag: [ '*' ]});
      await expect(store.modifyResource(resourceID, representation, conditions))
        .rejects.toThrow('error');
    });

    it('is not supported.', async(): Promise<void> => {
      const result = store.modifyResource({ path: root }, representation);
      await expect(result).rejects.toThrow(NotImplementedHttpError);
      await expect(result).rejects.toThrow('Patches are not supported by the default store.');
    });
  });

  describe('deleting a Resource', (): void => {
    it('will 404 if the identifier does not contain the root.', async(): Promise<void> => {
      await expect(store.deleteResource({ path: 'verybadpath' }))
        .rejects.toThrow(NotFoundHttpError);
    });

    it('will error when deleting a root storage container.', async(): Promise<void> => {
      representation.metadata.add(RDF.type, PIM.terms.Storage);
      accessor.data[`${root}container/`] = representation;
      const result = store.deleteResource({ path: `${root}container/` });
      await expect(result).rejects.toThrow(MethodNotAllowedHttpError);
      await expect(result).rejects.toThrow('Cannot delete a root storage container.');
    });

    it('will error when deleting an auxiliary of a root storage container if not allowed.', async(): Promise<void> => {
      const storageMetadata = new RepresentationMetadata(representation.metadata);
      storageMetadata.add(RDF.type, PIM.terms.Storage);
      accessor.data[`${root}container/`] = new BasicRepresentation(representation.data, storageMetadata);
      accessor.data[`${root}container/.dummy`] = representation;
      auxiliaryStrategy.isRequiredInRoot = jest.fn().mockReturnValue(true);
      const result = store.deleteResource({ path: `${root}container/.dummy` });
      await expect(result).rejects.toThrow(MethodNotAllowedHttpError);
      await expect(result).rejects.toThrow(
        'Cannot delete http://test.com/container/.dummy from a root storage container.',
      );
    });

    it('will error when deleting non-empty containers.', async(): Promise<void> => {
      accessor.data[`${root}container/`] = representation;
      accessor.data[`${root}container/otherThing`] = representation;
      const result = store.deleteResource({ path: `${root}container/` });
      await expect(result).rejects.toThrow(ConflictHttpError);
      await expect(result).rejects.toThrow('Can only delete empty containers.');
    });

    it('throws a 412 if the conditions are not matched.', async(): Promise<void> => {
      const resourceID = { path: root };
      const conditions = new BasicConditions({ notMatchesETag: [ '*' ]});
      await expect(store.deleteResource(resourceID, conditions))
        .rejects.toThrow(PreconditionFailedHttpError);
    });

    it('will delete resources.', async(): Promise<void> => {
      accessor.data[`${root}resource`] = representation;
      await expect(store.deleteResource({ path: `${root}resource` })).resolves.toEqual([
        { path: `${root}resource` },
        { path: root },
      ]);
      expect(accessor.data[`${root}resource`]).toBeUndefined();
      expect(accessor.data[root].metadata.get(DC.terms.modified)?.value).toBe(now.toISOString());
      expect(accessor.data[root].metadata.get(GENERATED_PREDICATE)).toBeUndefined();
    });

    it('will delete root non-storage containers.', async(): Promise<void> => {
      accessor.data[root] = new BasicRepresentation(representation.data, containerMetadata);
      await expect(store.deleteResource({ path: root })).resolves.toEqual([
        { path: root },
      ]);
      expect(accessor.data[root]).toBeUndefined();
    });

    it('will delete a root storage auxiliary resource of a non-root container.', async(): Promise<void> => {
      const storageMetadata = new RepresentationMetadata(representation.metadata);
      accessor.data[`${root}container/`] = new BasicRepresentation(representation.data, storageMetadata);
      accessor.data[`${root}container/.dummy`] = representation;
      auxiliaryStrategy.isRequiredInRoot = jest.fn().mockReturnValue(true);
      await expect(store.deleteResource({ path: `${root}container/.dummy` })).resolves.toEqual([
        { path: `${root}container/.dummy` },
        { path: `${root}container/` },
      ]);
      expect(accessor.data[`${root}container/.dummy`]).toBeUndefined();
    });

    it('will delete related auxiliary resources.', async(): Promise<void> => {
      accessor.data[`${root}container/`] = representation;
      accessor.data[`${root}container/.dummy`] = representation;
      await expect(store.deleteResource({ path: `${root}container/` })).resolves.toEqual([
        { path: `${root}container/` },
        { path: `${root}container/.dummy` },
        { path: root },
      ]);
      expect(accessor.data[`${root}container/`]).toBeUndefined();
      expect(accessor.data[`${root}container/.dummy`]).toBeUndefined();
    });

    it('will still delete a resource if deleting auxiliary resources causes errors.', async(): Promise<void> => {
      accessor.data[`${root}resource`] = representation;
      accessor.data[`${root}resource.dummy`] = representation;
      const deleteFn = accessor.deleteResource;
      accessor.deleteResource = jest.fn(async(identifier: ResourceIdentifier): Promise<void> => {
        if (auxiliaryStrategy.isAuxiliaryIdentifier(identifier)) {
          throw new Error('auxiliary error!');
        }
        await deleteFn.call(accessor, identifier);
      });
      const { logger } = store as any;
      logger.error = jest.fn();
      await expect(store.deleteResource({ path: `${root}resource` })).resolves.toEqual([
        { path: `${root}resource` },
        { path: root },
      ]);
      expect(accessor.data[`${root}resource`]).toBeUndefined();
      expect(accessor.data[`${root}resource.dummy`]).toBeDefined();
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenLastCalledWith(
        'Error deleting auxiliary resource http://test.com/resource.dummy: auxiliary error!',
      );
    });

    it('rejects deleting a metadata resource.', async(): Promise<void> => {
      const metaResourceID = { path: `${root}resource.meta` };

      await expect(store.deleteResource(metaResourceID)).rejects.toThrow(ConflictHttpError);
    });
  });

  describe('resource Exists', (): void => {
    it('should return false when the resource does not exist.', async(): Promise<void> => {
      const resourceID = { path: `${root}resource` };
      await expect(store.resourceExists(resourceID)).resolves.toBeFalsy();
    });

    it('should return true when the resource exists.', async(): Promise<void> => {
      const resourceID = { path: `${root}resource` };
      accessor.data[resourceID.path] = representation;
      await expect(store.resourceExists(resourceID)).resolves.toBeTruthy();
    });

    it('should rethrow any unexpected errors from validateIdentifier.', async(): Promise<void> => {
      const resourceID = { path: `${root}resource` };
      const originalMetaData = accessor.getMetadata;
      accessor.getMetadata = jest.fn(async(): Promise<any> => {
        throw new Error('error');
      });
      await expect(store.resourceExists(resourceID)).rejects.toThrow('error');
      accessor.getMetadata = originalMetaData;
    });

    it('should return false when the metadata resource does not exist.', async(): Promise<void> => {
      const metaResourceID = { path: `${root}resource.meta` };
      await expect(store.resourceExists(metaResourceID)).resolves.toBeFalsy();
    });

    it('should return true when the metadata resource exists.', async(): Promise<void> => {
      const resourceID = { path: `${root}resource` };
      const metaResourceID = { path: `${root}resource.meta` };

      accessor.data[resourceID.path] = representation;
      await expect(store.resourceExists(metaResourceID)).resolves.toBeTruthy();
    });
  });
});

