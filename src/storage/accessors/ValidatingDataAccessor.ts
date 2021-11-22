import type { Readable } from 'stream';
import type { Validator } from '../../http/auxiliary/Validator';
import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { Guarded } from '../../util/GuardedStream';
import type { DataAccessor } from './DataAccessor';
import { PassthroughDataAccessor } from './PassthroughDataAccessor';

/**
 * A ValidatingDataAccessor wraps an AtomicDataAccessor such that,
 * while writing a document, validation is performed before writing the data.
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
    const pipedRep = await this.validator.handle({
      representation: new BasicRepresentation(data, metadata),
      identifier,
    });
    return this.accessor.writeDocument(identifier, pipedRep.data, metadata);
  }

  public async writeContainer(identifier: ResourceIdentifier, metadata: RepresentationMetadata): Promise<void> {
    // A container's data mainly resides in its metadata which we can't calculate the disk size of
    // at this point in code.
    // Extra info can be found here: https://github.com/solid/community-server/pull/973#discussion_r723376888
    return this.accessor.writeContainer(identifier, metadata);
  }
}