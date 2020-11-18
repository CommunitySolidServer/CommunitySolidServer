import { Readable } from 'stream';
import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'n3';
import type { NamedNode } from 'rdf-js';
import { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import { ensureTrailingSlash } from '../../util/PathUtil';
import { generateContainmentQuads, generateResourceQuads } from '../../util/ResourceUtil';
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

class ArrayReadable extends Readable {
  private readonly data: any[];
  private idx: number;

  public constructor(data: any[]) {
    super({ objectMode: true });
    this.data = data;
    this.idx = 0;
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  public _read(): void {
    if (this.idx < this.data.length) {
      this.push(this.data[this.idx]);
      this.idx += 1;
    } else {
      this.push(null);
    }
  }
}

export class InMemoryDataAccessor implements DataAccessor {
  private readonly base: string;
  private readonly store: ContainerEntry;

  public constructor(base: string) {
    this.base = ensureTrailingSlash(base);

    const metadata = new RepresentationMetadata(this.base);
    metadata.addQuads(generateResourceQuads(DataFactory.namedNode(this.base), true));
    this.store = { entries: {}, metadata };
  }

  public async canHandle(): Promise<void> {
    // All data is supported since streams never get read, only copied
  }

  public async getData(identifier: ResourceIdentifier): Promise<Readable> {
    const entry = this.getEntry(identifier);
    if (!this.isDataEntry(entry)) {
      throw new NotFoundHttpError();
    }
    return new ArrayReadable(entry.data);
  }

  public async getMetadata(identifier: ResourceIdentifier): Promise<RepresentationMetadata> {
    const entry = this.getEntry(identifier);
    if (this.isDataEntry(entry) === identifier.path.endsWith('/')) {
      throw new NotFoundHttpError();
    }
    return this.generateMetadata(identifier, entry);
  }

  public async writeDocument(identifier: ResourceIdentifier, data: Readable, metadata: RepresentationMetadata):
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
    const parts = identifier.path.slice(this.base.length).split('/').filter((part): boolean => part.length > 0);

    if (parts.length === 0) {
      throw new Error('Root container has no parent.');
    }

    // Name of the resource will be the last entry in the path
    const name = parts[parts.length - 1];

    // All names preceding the last should be nested containers
    const containers = parts.slice(0, -1);

    // Step through the parts of the path up to the end
    let parent = this.store;
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
    if (identifier.path === this.base) {
      return this.store;
    }
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
