import type { Readable } from 'node:stream';
import type { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { Guarded } from '../../util/GuardedStream';
import type { FilterPattern } from '../../util/QuadUtil';
import type { DataAccessor } from './DataAccessor';
import { PassthroughDataAccessor } from './PassthroughDataAccessor';

/**
 * A FilterMetadataDataAccessor wraps a DataAccessor such that specific metadata properties
 * can be filtered before passing on the call to the wrapped DataAccessor.
 */
export class FilterMetadataDataAccessor extends PassthroughDataAccessor {
  private readonly filters: FilterPattern[];

  /**
   * Construct an instance of FilterMetadataDataAccessor.
   *
   * @param accessor - The DataAccessor to wrap.
   * @param filters - Filter patterns to be used for metadata removal.
   */
  public constructor(accessor: DataAccessor, filters: FilterPattern[]) {
    super(accessor);
    this.filters = filters;
  }

  public async writeDocument(
    identifier: ResourceIdentifier,
    data: Guarded<Readable>,
    metadata: RepresentationMetadata,
  ): Promise<void> {
    this.applyFilters(metadata);
    return this.accessor.writeDocument(identifier, data, metadata);
  }

  public async writeContainer(identifier: ResourceIdentifier, metadata: RepresentationMetadata): Promise<void> {
    this.applyFilters(metadata);
    return this.accessor.writeContainer(identifier, metadata);
  }

  /**
   * Utility function that removes metadata entries,
   * based on the configured filter patterns.
   *
   * @param metadata - Metadata for the request.
   */
  private applyFilters(metadata: RepresentationMetadata): void {
    for (const filter of this.filters) {
      // Find the matching quads.
      const matchingQuads = metadata.quads(filter.subject, filter.predicate, filter.object);
      // Remove the resulset.
      metadata.removeQuads(matchingQuads);
    }
  }
}
