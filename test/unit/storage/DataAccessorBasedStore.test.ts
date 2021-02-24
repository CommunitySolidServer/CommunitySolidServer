import 'jest-rdf';
import type { Readable } from 'stream';
import arrayifyStream from 'arrayify-stream';
import type { Quad } from 'n3';
import { DataFactory } from 'n3';
import type { AuxiliaryStrategy } from '../../../src/ldp/auxiliary/AuxiliaryStrategy';
import { BasicRepresentation } from '../../../src/ldp/representation/BasicRepresentation';
import type { Representation } from '../../../src/ldp/representation/Representation';
import { RepresentationMetadata } from '../../../src/ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../src/ldp/representation/ResourceIdentifier';
import type { DataAccessor } from '../../../src/storage/accessors/DataAccessor';
import { DataAccessorBasedStore } from '../../../src/storage/DataAccessorBasedStore';
import { INTERNAL_QUADS } from '../../../src/util/ContentTypes';
import { BadRequestHttpError } from '../../../src/util/errors/BadRequestHttpError';
import { ConflictHttpError } from '../../../src/util/errors/ConflictHttpError';
import { ForbiddenHttpError } from '../../../src/util/errors/ForbiddenHttpError';
import { MethodNotAllowedHttpError } from '../../../src/util/errors/MethodNotAllowedHttpError';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../../../src/util/errors/NotImplementedHttpError';
import type { Guarded } from '../../../src/util/GuardedStream';
import { SingleRootIdentifierStrategy } from '../../../src/util/identifiers/SingleRootIdentifierStrategy';
import * as quadUtil from '../../../src/util/QuadUtil';
import { guardedStreamFrom } from '../../../src/util/StreamUtil';
import { CONTENT_TYPE, HTTP, LDP, PIM, RDF } from '../../../src/util/Vocabularies';
import quad = DataFactory.quad;
import namedNode = DataFactory.namedNode;

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
    return undefined;
  }

  public async getData(identifier: ResourceIdentifier): Promise<Guarded<Readable>> {
    this.checkExists(identifier);
    return this.data[identifier.path].data;
  }

  public async getMetadata(identifier: ResourceIdentifier): Promise<RepresentationMetadata> {
    this.checkExists(identifier);
    return this.data[identifier.path].metadata;
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

class SimpleSuffixStrategy implements AuxiliaryStrategy {
  private readonly suffix: string;

  public constructor(suffix: string) {
    this.suffix = suffix;
  }

  public getAuxiliaryIdentifier(identifier: ResourceIdentifier): ResourceIdentifier {
    return { path: `${identifier.path}${this.suffix}` };
  }

  public getAuxiliaryIdentifiers(identifier: ResourceIdentifier): ResourceIdentifier[] {
    return [ this.getAuxiliaryIdentifier(identifier) ];
  }

  public isAuxiliaryIdentifier(identifier: ResourceIdentifier): boolean {
    return identifier.path.endsWith(this.suffix);
  }

  public getAssociatedIdentifier(identifier: ResourceIdentifier): ResourceIdentifier {
    return { path: identifier.path.slice(0, -this.suffix.length) };
  }

  public isRootRequired(): boolean {
    return false;
  }

  public async addMetadata(metadata: RepresentationMetadata): Promise<void> {
    const identifier = { path: metadata.identifier.value };
    // Random triple to test on
    metadata.add(identifier.path, this.getAuxiliaryIdentifier(identifier).path);
  }

  public async validate(): Promise<void> {
    // Always validates
  }
}

describe('A DataAccessorBasedStore', (): void => {
  let store: DataAccessorBasedStore;
  let accessor: SimpleDataAccessor;
  const root = 'http://test.com/';
  const identifierStrategy = new SingleRootIdentifierStrategy(root);
  let auxStrategy: AuxiliaryStrategy;
  let containerMetadata: RepresentationMetadata;
  let representation: Representation;
  const resourceData = 'text';

  beforeEach(async(): Promise<void> => {
    accessor = new SimpleDataAccessor();

    auxStrategy = new SimpleSuffixStrategy('.dummy');
    store = new DataAccessorBasedStore(accessor, identifierStrategy, auxStrategy);

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
      expect(result.metadata.contentType).toEqual('text/plain');
      expect(result.metadata.get(resourceID.path)?.value).toBe(auxStrategy.getAuxiliaryIdentifier(resourceID).path);
    });

    it('will return a data stream that matches the metadata for containers.', async(): Promise<void> => {
      const resourceID = { path: `${root}container/` };
      containerMetadata.identifier = namedNode(resourceID.path);
      accessor.data[resourceID.path] = { metadata: containerMetadata } as Representation;
      const metaMirror = new RepresentationMetadata(containerMetadata);
      await auxStrategy.addMetadata(metaMirror);
      const result = await store.getRepresentation(resourceID);
      expect(result).toMatchObject({ binary: false });
      expect(await arrayifyStream(result.data)).toBeRdfIsomorphic(metaMirror.quads());
      expect(result.metadata.contentType).toEqual(INTERNAL_QUADS);
      expect(result.metadata.get(resourceID.path)?.value).toBe(auxStrategy.getAuxiliaryIdentifier(resourceID).path);
    });

    it('will remove containment triples referencing auxiliary resources.', async(): Promise<void> => {
      const resourceID = { path: `${root}container/` };
      containerMetadata.identifier = namedNode(resourceID.path);
      containerMetadata.add(LDP.terms.contains, [
        DataFactory.namedNode(`${root}container/.dummy`),
        DataFactory.namedNode(`${root}container/resource`),
        DataFactory.namedNode(`${root}container/resource.dummy`),
      ]);
      accessor.data[resourceID.path] = { metadata: containerMetadata } as Representation;
      const result = await store.getRepresentation(resourceID);
      const contains = result.metadata.getAll(LDP.terms.contains);
      expect(contains).toHaveLength(1);
      expect(contains[0].value).toEqual(`${root}container/resource`);
    });
  });

  describe('adding a Resource', (): void => {
    it('will 404 if the identifier does not contain the root.', async(): Promise<void> => {
      await expect(store.addResource({ path: 'verybadpath' }, representation))
        .rejects.toThrow(NotFoundHttpError);
    });

    it('checks if the DataAccessor supports the data.', async(): Promise<void> => {
      const resourceID = { path: `${root}container/` };
      representation.binary = false;
      await expect(store.addResource(resourceID, representation)).rejects.toThrow(BadRequestHttpError);
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

    it('errors when trying to create a container with non-RDF data.', async(): Promise<void> => {
      const resourceID = { path: root };
      representation.metadata.add(RDF.type, LDP.terms.Container);
      await expect(store.addResource(resourceID, representation)).rejects.toThrow(BadRequestHttpError);
    });

    it('passes the result along if the MetadataController throws a non-Error.', async(): Promise<void> => {
      const resourceID = { path: root };
      const mock = jest.spyOn(quadUtil, 'parseQuads').mockImplementationOnce(async(): Promise<any> => {
        throw 'apple';
      });
      representation.metadata.add(RDF.type, LDP.terms.Container);
      await expect(store.addResource(resourceID, representation)).rejects.toBe('apple');
      mock.mockRestore();
    });

    it('can write resources.', async(): Promise<void> => {
      const resourceID = { path: root };
      representation.metadata.removeAll(RDF.type);
      const result = await store.addResource(resourceID, representation);
      expect(result).toEqual({
        path: expect.stringMatching(new RegExp(`^${root}[^/]+$`, 'u')),
      });
      await expect(arrayifyStream(accessor.data[result.path].data)).resolves.toEqual([ resourceData ]);
    });

    it('can write containers.', async(): Promise<void> => {
      const resourceID = { path: root };
      representation.metadata.add(RDF.type, LDP.terms.Container);
      representation.metadata.contentType = 'text/turtle';
      representation.data = guardedStreamFrom([ '<> a <http://test.com/coolContainer>.' ]);
      const result = await store.addResource(resourceID, representation);
      expect(result).toEqual({
        path: expect.stringMatching(new RegExp(`^${root}[^/]+/$`, 'u')),
      });
      expect(accessor.data[result.path]).toBeTruthy();
      expect(accessor.data[result.path].metadata.contentType).toBeUndefined();

      const { data } = await store.getRepresentation(result);
      const quads: Quad[] = await arrayifyStream(data);
      expect(quads.some((entry): boolean => entry.subject.value === result.path &&
        entry.object.value === 'http://test.com/coolContainer')).toBeTruthy();
    });

    it('creates a URI based on the incoming slug.', async(): Promise<void> => {
      const resourceID = { path: root };
      representation.metadata.removeAll(RDF.type);
      representation.metadata.add(HTTP.slug, 'newName');
      const result = await store.addResource(resourceID, representation);
      expect(result).toEqual({
        path: `${root}newName`,
      });
    });

    it('generates a new URI if adding the slug would create an existing URI.', async(): Promise<void> => {
      const resourceID = { path: root };
      representation.metadata.add(HTTP.slug, 'newName');
      accessor.data[`${root}newName`] = representation;
      accessor.data[root].metadata.add(LDP.contains, DataFactory.namedNode(`${root}newName`));
      const result = await store.addResource(resourceID, representation);
      expect(result).not.toEqual({
        path: `${root}newName`,
      });
      expect(result).not.toEqual({
        path: expect.stringMatching(new RegExp(`^${root}[^/]+/$`, 'u')),
      });
    });

    it('errors if the slug would cause an auxiliary resource URI to be generated.', async(): Promise<void> => {
      const resourceID = { path: root };
      representation.metadata.removeAll(RDF.type);
      representation.metadata.add(HTTP.slug, 'test.dummy');
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
      representation.binary = false;
      await expect(store.setRepresentation(resourceID, representation)).rejects.toThrow(BadRequestHttpError);
    });

    it('will error if the path has a different slash than the existing one.', async(): Promise<void> => {
      const resourceID = { path: `${root}resource` };
      accessor.data[`${resourceID.path}/`] = representation;
      representation.metadata.identifier = DataFactory.namedNode(`${resourceID.path}/`);
      const prom = store.setRepresentation(resourceID, representation);
      await expect(prom).rejects.toThrow(`${resourceID.path} conflicts with existing path ${resourceID.path}/`);
      await expect(prom).rejects.toThrow(ForbiddenHttpError);
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
      representation.data = guardedStreamFrom([ `<${`${root}`}> a <coolContainer>.` ]);

      await expect(store.setRepresentation(resourceID, representation))
        .resolves.toBeUndefined();
      expect(mock).toHaveBeenCalledTimes(1);
      expect(mock).toHaveBeenLastCalledWith(resourceID);

      mock.mockRestore();
    });

    it('will error if the ending slash does not match its resource type.', async(): Promise<void> => {
      const resourceID = { path: `${root}resource` };
      representation.metadata.add(RDF.type, LDP.terms.Container);
      await expect(store.setRepresentation(resourceID, representation)).rejects.toThrow(
        new BadRequestHttpError('Containers should have a `/` at the end of their path, resources should not.'),
      );
    });

    it('errors when trying to create a container with non-RDF data.', async(): Promise<void> => {
      const resourceID = { path: `${root}container/` };
      representation.metadata.add(RDF.type, LDP.terms.Container);
      await expect(store.setRepresentation(resourceID, representation)).rejects.toThrow(BadRequestHttpError);
    });

    it('errors when trying to create an auxiliary resource with invalid data.', async(): Promise<void> => {
      const resourceID = { path: `${root}resource.dummy` };
      auxStrategy.validate = jest.fn().mockRejectedValue(new Error('bad data!'));
      await expect(store.setRepresentation(resourceID, representation)).rejects.toThrow('bad data!');
    });

    it('can write resources.', async(): Promise<void> => {
      const resourceID = { path: `${root}resource` };
      await expect(store.setRepresentation(resourceID, representation)).resolves.toBeUndefined();
      await expect(arrayifyStream(accessor.data[resourceID.path].data)).resolves.toEqual([ resourceData ]);
    });

    it('can write containers.', async(): Promise<void> => {
      const resourceID = { path: `${root}container/` };

      // Generate based on URI
      representation.metadata.removeAll(RDF.type);
      representation.metadata.contentType = 'text/turtle';
      representation.data = guardedStreamFrom([ `<${`${root}resource/`}> a <coolContainer>.` ]);
      await expect(store.setRepresentation(resourceID, representation)).resolves.toBeUndefined();
      expect(accessor.data[resourceID.path]).toBeTruthy();
      expect(accessor.data[resourceID.path].metadata.contentType).toBeUndefined();
    });

    it('can write resources even if root does not exist.', async(): Promise<void> => {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete accessor.data[root];
      const resourceID = { path: `${root}resource` };
      await expect(store.setRepresentation(resourceID, representation)).resolves.toBeUndefined();
      await expect(arrayifyStream(accessor.data[resourceID.path].data)).resolves.toEqual([ resourceData ]);
    });

    it('can write containers with quad data.', async(): Promise<void> => {
      const resourceID = { path: `${root}container/` };

      // Generate based on URI
      representation.metadata.removeAll(RDF.type);
      representation.metadata.contentType = 'internal/quads';
      representation.data = guardedStreamFrom(
        [ quad(namedNode(`${root}resource/`), namedNode('a'), namedNode('coolContainer')) ],
      );
      await expect(store.setRepresentation(resourceID, representation)).resolves.toBeUndefined();
      expect(accessor.data[resourceID.path]).toBeTruthy();
      expect(accessor.data[resourceID.path].metadata.contentType).toBeUndefined();
    });

    it('errors when trying to create a container with containment triples.', async(): Promise<void> => {
      const resourceID = { path: `${root}container/` };
      representation.metadata.add(RDF.type, LDP.terms.Container);
      representation.metadata.contentType = 'text/turtle';
      representation.metadata.identifier = DataFactory.namedNode(`${root}resource/`);
      representation.data = guardedStreamFrom(
        [ `<${`${root}resource/`}> <http://www.w3.org/ns/ldp#contains> <uri>.` ],
      );
      const result = store.setRepresentation(resourceID, representation);
      await expect(result).rejects.toThrow(ConflictHttpError);
      await expect(result).rejects.toThrow('Container bodies are not allowed to have containment triples.');
    });

    it('creates recursive containers when needed.', async(): Promise<void> => {
      const resourceID = { path: `${root}a/b/resource` };
      await expect(store.setRepresentation(resourceID, representation)).resolves.toBeUndefined();
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
      await expect(store.setRepresentation(resourceID, representation)).resolves.toBeUndefined();
      expect(accessor.data[resourceID.path]).toBeTruthy();
      expect(Object.keys(accessor.data)).toHaveLength(1);
      expect(accessor.data[resourceID.path].metadata.contentType).toBeUndefined();
    });
  });

  describe('modifying a Representation', (): void => {
    it('is not supported.', async(): Promise<void> => {
      const result = store.modifyResource();
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
      auxStrategy.isRootRequired = jest.fn().mockReturnValue(true);
      const result = store.deleteResource({ path: `${root}container/.dummy` });
      await expect(result).rejects.toThrow(MethodNotAllowedHttpError);
      await expect(result).rejects.toThrow(
        'Cannot delete http://test.com/container/.dummy from a root storage container.',
      );
    });

    it('will error when deleting non-empty containers.', async(): Promise<void> => {
      accessor.data[`${root}container/`] = representation;
      accessor.data[`${root}container/`].metadata.add(LDP.contains, DataFactory.namedNode(`${root}otherThing`));
      const result = store.deleteResource({ path: `${root}container/` });
      await expect(result).rejects.toThrow(ConflictHttpError);
      await expect(result).rejects.toThrow('Can only delete empty containers.');
    });

    it('will delete resources.', async(): Promise<void> => {
      accessor.data[`${root}resource`] = representation;
      await expect(store.deleteResource({ path: `${root}resource` })).resolves.toBeUndefined();
      expect(accessor.data[`${root}resource`]).toBeUndefined();
    });

    it('will delete a root storage auxiliary resource of a non-root container.', async(): Promise<void> => {
      const storageMetadata = new RepresentationMetadata(representation.metadata);
      accessor.data[`${root}container/`] = new BasicRepresentation(representation.data, storageMetadata);
      accessor.data[`${root}container/.dummy`] = representation;
      auxStrategy.isRootRequired = jest.fn().mockReturnValue(true);
      await expect(store.deleteResource({ path: `${root}container/.dummy` })).resolves.toBeUndefined();
      expect(accessor.data[`${root}container/.dummy`]).toBeUndefined();
    });

    it('will delete related auxiliary resources.', async(): Promise<void> => {
      accessor.data[`${root}container/`] = representation;
      accessor.data[`${root}container/.dummy`] = representation;
      await expect(store.deleteResource({ path: `${root}container/` })).resolves.toBeUndefined();
      expect(accessor.data[`${root}container/`]).toBeUndefined();
      expect(accessor.data[`${root}container/.dummy`]).toBeUndefined();
    });

    it('will still delete a resource if deleting auxiliary resources causes errors.', async(): Promise<void> => {
      accessor.data[`${root}resource`] = representation;
      accessor.data[`${root}resource.dummy`] = representation;
      const deleteFn = accessor.deleteResource;
      accessor.deleteResource = jest.fn(async(identifier: ResourceIdentifier): Promise<void> => {
        if (auxStrategy.isAuxiliaryIdentifier(identifier)) {
          throw new Error('auxiliary error!');
        }
        await deleteFn.call(accessor, identifier);
      });
      const { logger } = store as any;
      logger.error = jest.fn();
      await expect(store.deleteResource({ path: `${root}resource` })).resolves.toBeUndefined();
      expect(accessor.data[`${root}resource`]).toBeUndefined();
      expect(accessor.data[`${root}resource.dummy`]).not.toBeUndefined();
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenLastCalledWith(
        'Problem deleting auxiliary resource http://test.com/resource.dummy: auxiliary error!',
      );
    });

    it('can also handle auxiliary deletion to throw non-native errors.', async(): Promise<void> => {
      accessor.data[`${root}resource`] = representation;
      accessor.data[`${root}resource.dummy`] = representation;
      const deleteFn = accessor.deleteResource;
      accessor.deleteResource = jest.fn(async(identifier: ResourceIdentifier): Promise<void> => {
        if (auxStrategy.isAuxiliaryIdentifier(identifier)) {
          throw 'auxiliary error!';
        }
        await deleteFn.call(accessor, identifier);
      });
      const { logger } = store as any;
      logger.error = jest.fn();
      await expect(store.deleteResource({ path: `${root}resource` })).resolves.toBeUndefined();
      expect(accessor.data[`${root}resource`]).toBeUndefined();
      expect(accessor.data[`${root}resource.dummy`]).not.toBeUndefined();
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenLastCalledWith(
        'Problem deleting auxiliary resource http://test.com/resource.dummy: auxiliary error!',
      );
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
    it('should rethrow any unexpedted errors from getRepresentation.', async(): Promise<void> => {
      const resourceID = { path: `fail` };
      const originalGetRepresentation = store.getRepresentation;
      store.getRepresentation = jest.fn(async(): Promise<Representation> => {
        throw new Error('error');
      });
      await expect(store.resourceExists(resourceID)).rejects.toThrow('error');
      store.getRepresentation = originalGetRepresentation;
    });
  });
});
