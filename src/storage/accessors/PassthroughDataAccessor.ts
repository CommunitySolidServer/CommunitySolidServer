import type { Readable } from 'stream';
import type { Representation } from '../../http/representation/Representation';
import type { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { Guarded } from '../../util/GuardedStream';
import type { AtomicDataAccessor } from './AtomicDataAccessor';
import type { DataAccessor } from './DataAccessor';

/**
 * A PassthroughDataAccessor simple passes the call to its child accessor
 */
export class PassthroughDataAccessor implements DataAccessor {
  protected readonly accessor: AtomicDataAccessor;

  public constructor(accessor: DataAccessor) {
    this.accessor = accessor;
  }

  public async writeDocument(identifier: ResourceIdentifier, data: Guarded<Readable>, metadata: RepresentationMetadata):
  Promise<void> {
    return this.accessor.writeDocument(identifier, data, metadata);
  }

  public async writeContainer(identifier: ResourceIdentifier, metadata: RepresentationMetadata): Promise<void> {
    return this.accessor.writeContainer(identifier, metadata);
  }

  public async canHandle(representation: Representation): Promise<void> {
    return this.accessor.canHandle(representation);
  }

  public async getData(identifier: ResourceIdentifier): Promise<Guarded<Readable>> {
    return this.accessor.getData(identifier);
  }

  public async getMetadata(identifier: ResourceIdentifier): Promise<RepresentationMetadata> {
    return this.accessor.getMetadata(identifier);
  }

  public getChildren(identifier: ResourceIdentifier): AsyncIterableIterator<RepresentationMetadata> {
    return this.accessor.getChildren(identifier);
  }

  public async deleteResource(identifier: ResourceIdentifier): Promise<void> {
    return this.accessor.deleteResource(identifier);
  }
}
