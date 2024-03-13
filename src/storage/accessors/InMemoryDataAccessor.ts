import type { Readable } from 'node:stream';
import arrayifyStream from 'arrayify-stream';
import { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { SingleThreaded } from '../../init/cluster/SingleThreaded';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import type { Guarded } from '../../util/GuardedStream';
import type { IdentifierStrategy } from '../../util/identifiers/IdentifierStrategy';
import { guardedStreamFrom } from '../../util/StreamUtil';
import { POSIX } from '../../util/Vocabularies';
import { isInternalContentType } from '../conversion/ConversionUtil';
import type { DataAccessor } from './DataAccessor';

interface DataEntry {
  data: unknown[];
  metadata: RepresentationMetadata;
}
interface ContainerEntry {
  entries: Record<string, CacheEntry>;
  metadata: RepresentationMetadata;
}
type CacheEntry = DataEntry | ContainerEntry;

export class InMemoryDataAccessor implements DataAccessor, SingleThreaded {
  private readonly identifierStrategy: IdentifierStrategy;
  // A dummy container where every entry corresponds to a root container
  private readonly store: { entries: Record<string, ContainerEntry> };

  public constructor(identifierStrategy: IdentifierStrategy) {
    this.identifierStrategy = identifierStrategy;

    this.store = { entries: {}};
  }

  public async canHandle(): Promise<void> {
    // All data is supported since streams never get read, only copied
  }

  public async getData(identifier: ResourceIdentifier): Promise<Guarded<Readable>> {
    const entry = this.getEntry(identifier);
    if (!this.isDataEntry(entry)) {
      throw new NotFoundHttpError();
    }
    return guardedStreamFrom(entry.data);
  }

  public async getMetadata(identifier: ResourceIdentifier): Promise<RepresentationMetadata> {
    const entry = this.getEntry(identifier);
    return new RepresentationMetadata(entry.metadata);
  }

  public async* getChildren(identifier: ResourceIdentifier): AsyncIterableIterator<RepresentationMetadata> {
    const entry = this.getEntry(identifier);
    if (!this.isDataEntry(entry)) {
      const childNames = Object.keys(entry.entries);
      yield* childNames.map((name): RepresentationMetadata => new RepresentationMetadata({ path: name }));
    }
  }

  public async writeDocument(identifier: ResourceIdentifier, data: Guarded<Readable>, metadata: RepresentationMetadata):
  Promise<void> {
    const parent = this.getParentEntry(identifier);
    // Drain original stream and create copy
    const dataArray = await arrayifyStream(data);

    // Only add the size for binary streams, which are all streams that do not have an internal type.
    if (metadata.contentType && !isInternalContentType(metadata.contentType)) {
      const size = dataArray.reduce<number>((total, chunk: Buffer): number => total + chunk.length, 0);
      metadata.set(POSIX.terms.size, `${size}`);
    }

    parent.entries[identifier.path] = {
      data: dataArray,
      metadata,
    };
  }

  public async writeContainer(identifier: ResourceIdentifier, metadata: RepresentationMetadata): Promise<void> {
    try {
      // Overwrite existing metadata but keep children if container already exists
      const entry = this.getEntry(identifier);
      entry.metadata = metadata;
    } catch (error: unknown) {
      // Create new entry if it didn't exist yet
      if (NotFoundHttpError.isInstance(error)) {
        const parent = this.getParentEntry(identifier);
        parent.entries[identifier.path] = {
          entries: {},
          metadata,
        };
      } else {
        throw error;
      }
    }
  }

  public async writeMetadata(identifier: ResourceIdentifier, metadata: RepresentationMetadata): Promise<void> {
    const entry = this.getEntry(identifier);
    entry.metadata = metadata;
  }

  public async deleteResource(identifier: ResourceIdentifier): Promise<void> {
    const parent = this.getParentEntry(identifier);
    if (!parent.entries[identifier.path]) {
      throw new NotFoundHttpError();
    }
    delete parent.entries[identifier.path];
  }

  private isDataEntry(entry: CacheEntry): entry is DataEntry {
    return Boolean((entry as DataEntry).data);
  }

  /**
   * Generates an array of identifiers corresponding to the nested containers until the given identifier is reached.
   * This does not verify if these identifiers actually exist.
   */
  private getHierarchy(identifier: ResourceIdentifier): ResourceIdentifier[] {
    if (this.identifierStrategy.isRootContainer(identifier)) {
      return [ identifier ];
    }
    const hierarchy = this.getHierarchy(this.identifierStrategy.getParentContainer(identifier));
    hierarchy.push(identifier);
    return hierarchy;
  }

  /**
   * Returns the ContainerEntry corresponding to the parent container of the given identifier.
   * Will throw 404 if the parent does not exist.
   */
  private getParentEntry(identifier: ResourceIdentifier): ContainerEntry {
    // Casting is fine here as the parent should never be used as a real container
    let parent: CacheEntry = this.store as ContainerEntry;
    if (this.identifierStrategy.isRootContainer(identifier)) {
      return parent;
    }

    const hierarchy = this.getHierarchy(this.identifierStrategy.getParentContainer(identifier));
    for (const entry of hierarchy) {
      parent = parent.entries[entry.path];
      if (!parent) {
        throw new NotFoundHttpError();
      }
      if (this.isDataEntry(parent)) {
        throw new InternalServerError('Invalid path.');
      }
    }

    return parent;
  }

  /**
   * Returns the CacheEntry corresponding the given identifier.
   * Will throw 404 if the resource does not exist.
   */
  private getEntry(identifier: ResourceIdentifier): CacheEntry {
    const parent = this.getParentEntry(identifier);
    const entry = parent.entries[identifier.path];
    if (!entry) {
      throw new NotFoundHttpError();
    }
    return entry;
  }
}
