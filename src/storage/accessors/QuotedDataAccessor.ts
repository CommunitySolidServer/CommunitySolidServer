import type { Readable } from 'stream';
import type { QuotaStrategy } from 'somewhere';
import type { Representation } from '../../ldp/representation/Representation';
import type { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import type { Guarded } from '../../util/GuardedStream';
import type { DataAccessor } from './DataAccessor';

export class QuotedDataAccessor implements DataAccessor {
  private readonly accessor: DataAccessor;
  private readonly strategy: QuotaStrategy;

  public constructor(accessor: DataAccessor, strategy: QuotaStrategy) {
    this.accessor = accessor;
    this.strategy = strategy;
  }

  public async writeDocument(
    identifier: ResourceIdentifier,
    data: Guarded<Readable>,
    metadata: RepresentationMetadata,
  ): Promise<void> {
    // Use this value in the return call:
    // const pipedData = this.strategy.limitStream(identifier, data, metadata);
    return this.accessor.writeDocument(identifier, data, metadata);
  }

  public async writeContainer(identifier: ResourceIdentifier, metadata: RepresentationMetadata): Promise<void> {
    // Containers are not big, made the choice to not take them
    // into account for now
    return this.accessor.writeContainer(identifier, metadata);
  }

  // The following functions are unchanged and simply get passed along to the accessor

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
