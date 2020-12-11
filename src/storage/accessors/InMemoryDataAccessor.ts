import type { Readable } from 'stream';
import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'n3';
import type { NamedNode } from 'rdf-js';
import { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import type { Guarded } from '../../util/GuardedStream';
import { ensureTrailingSlash, isContainerIdentifier } from '../../util/PathUtil';
import { generateContainmentQuads, generateResourceQuads } from '../../util/ResourceUtil';
import { guardedStreamFrom } from '../../util/StreamUtil';
import type { DataAccessor } from './DataAccessor';

interface DataEntry {
  data: any[];
  metadata: RepresentationMetadata;
}
interface ContainerEntry {
  entries: Record<string, CacheEntry>;
  metadata: RepresentationMetadata;
}
type CacheEntry = DataEntry | ContainerEntry;

export class InMemoryDataAccessor implements DataAccessor {
  private readonly base: string;
  // A dummy container with one entry which corresponds to the base
  private readonly store: { entries: { ''?: ContainerEntry } };

  public constructor(base: string) {
    this.base = ensureTrailingSlash(base);

    const metadata = new RepresentationMetadata({ path: this.base });
    metadata.addQuads(generateResourceQuads(DataFactory.namedNode(this.base), true));
    const rootContainer = { entries: {}, metadata };
    this.store = { entries: { '': rootContainer }};
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
    if (this.isDataEntry(entry) === isContainerIdentifier(identifier)) {
      throw new NotFoundHttpError();
    }
    return this.generateMetadata(identifier, entry);
  }

  public async writeDocument(identifier: ResourceIdentifier, data: Guarded<Readable>, metadata: RepresentationMetadata):
  Promise<void> {
    const { parent, name } = this.getParentEntry(identifier);
    parent.entries[name] = {
      // Drain original stream and create copy
      data: await arrayifyStream(data),
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
      if (error instanceof NotFoundHttpError) {
        const { parent, name } = this.getParentEntry(identifier);
        parent.entries[name] = {
          entries: {},
          metadata,
        };
      } else {
        throw error;
      }
    }
  }

  public async deleteResource(identifier: ResourceIdentifier): Promise<void> {
    const { parent, name } = this.getParentEntry(identifier);
    if (!parent.entries[name]) {
      throw new NotFoundHttpError();
    }
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete parent.entries[name];
  }

  private isDataEntry(entry: CacheEntry): entry is DataEntry {
    return Boolean((entry as DataEntry).data);
  }

  private getParentEntry(identifier: ResourceIdentifier): { parent: ContainerEntry; name: string } {
    if (identifier.path === this.base) {
      // Casting is fine here as the parent should never be used as a real container
      return { parent: this.store as any, name: '' };
    }
    if (!this.store.entries['']) {
      throw new NotFoundHttpError();
    }

    const parts = identifier.path.slice(this.base.length).split('/').filter((part): boolean => part.length > 0);

    // Name of the resource will be the last entry in the path
    const name = parts[parts.length - 1];

    // All names preceding the last should be nested containers
    const containers = parts.slice(0, -1);

    // Step through the parts of the path up to the end
    // First entry is guaranteed to be a ContainerEntry
    let parent = this.store.entries[''];
    for (const container of containers) {
      const child = parent.entries[container];
      if (!child) {
        throw new NotFoundHttpError();
      } else if (this.isDataEntry(child)) {
        throw new Error('Invalid path.');
      }
      parent = child;
    }

    return { parent, name };
  }

  private getEntry(identifier: ResourceIdentifier): CacheEntry {
    const { parent, name } = this.getParentEntry(identifier);
    const entry = parent.entries[name];
    if (!entry) {
      throw new NotFoundHttpError();
    }
    return entry;
  }

  private generateMetadata(identifier: ResourceIdentifier, entry: CacheEntry): RepresentationMetadata {
    const metadata = new RepresentationMetadata(entry.metadata);
    if (!this.isDataEntry(entry)) {
      const childNames = Object.keys(entry.entries).map((name): string =>
        `${identifier.path}${name}${this.isDataEntry(entry.entries[name]) ? '' : '/'}`);
      const quads = generateContainmentQuads(metadata.identifier as NamedNode, childNames);
      metadata.addQuads(quads);
    }
    return metadata;
  }
}
