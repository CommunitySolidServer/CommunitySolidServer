import type { Readable } from 'node:stream';
import type { Validator } from '../../http/auxiliary/Validator';
import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { Guarded } from '../../util/GuardedStream';
import type { DataAccessor } from './DataAccessor';
import { PassthroughDataAccessor } from './PassthroughDataAccessor';

/**
 * A ValidatingDataAccessor wraps a DataAccessor such that the data stream is validated while being written.
 * An AtomicDataAccessor can be used to prevent data being written in case validation fails.
 */
export class ValidatingDataAccessor extends PassthroughDataAccessor {
  private readonly validator: Validator;

  public constructor(accessor: DataAccessor, validator: Validator) {
    super(accessor);
    this.validator = validator;
  }

  public async writeDocument(
    identifier: ResourceIdentifier,
    data: Guarded<Readable>,
    metadata: RepresentationMetadata,
  ): Promise<void> {
    const pipedRep = await this.validator.handleSafe({
      representation: new BasicRepresentation(data, metadata),
      identifier,
    });
    return this.accessor.writeDocument(identifier, pipedRep.data, metadata);
  }

  public async writeContainer(identifier: ResourceIdentifier, metadata: RepresentationMetadata): Promise<void> {
    // A container's data mainly resides in its metadata,
    // of which we can't calculate the disk size of at this point in the code.
    // Extra info can be found here: https://github.com/CommunitySolidServer/CommunitySolidServer/pull/973#discussion_r723376888
    return this.accessor.writeContainer(identifier, metadata);
  }
}
