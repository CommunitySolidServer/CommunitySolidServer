import type { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { IdentifierStrategy } from '../../util/identifiers/IdentifierStrategy';
import { RDF, PIM } from '../../util/Vocabularies';
import type { DataAccessor } from '../accessors/DataAccessor';
import type { Size } from '../size-reporter/Size';
import type { SizeReporter } from '../size-reporter/SizeReporter';
import { QuotaStrategy } from './QuotaStrategy';

/**
 * The GlobalQuotaStrategy sets a limit on the amount of data stored on the server globally
 */
export class PodQuotaStrategy extends QuotaStrategy {
  private readonly identifierStrategy: IdentifierStrategy;
  private readonly accessor: DataAccessor;

  public constructor(
    limit: Size,
    reporter: SizeReporter<any>,
    identifierStrategy: IdentifierStrategy,
    accessor: DataAccessor,
  ) {
    super(reporter, limit);
    this.identifierStrategy = identifierStrategy;
    this.accessor = accessor;
  }

  public getAvailableSpace = async(identifier: ResourceIdentifier): Promise<Size> => {
    const pimStorage = await this.searchPimStorage(identifier);

    // No storage was found containing this identifier, so we assume this identifier points to an internal location.
    // Quota does not apply here so there is always available space.
    if (!pimStorage) {
      return { amount: Number.MAX_SAFE_INTEGER, unit: this.limit.unit };
    }

    let used = (await this.reporter.getSize(pimStorage)).amount;

    // When a file is overwritten the space the file takes up right now should also
    // be counted as available space as it will disappear/be overwritten
    used -= (await this.reporter.getSize(identifier)).amount;
    console.log('TOTAL USED', { identifier, used, limit: this.limit, pimStorage });

    return { amount: this.limit.amount - used, unit: this.limit.unit };
  };

  /** Finds the closest parent container that has pim:storage as metadata */
  private async searchPimStorage(identifier: ResourceIdentifier): Promise<ResourceIdentifier | undefined> {
    if (this.identifierStrategy.isRootContainer(identifier)) {
      return undefined;
    }

    let metadata: RepresentationMetadata;
    const parent = this.identifierStrategy.getParentContainer(identifier);

    try {
      metadata = await this.accessor.getMetadata(identifier);
    } catch {
      // Resource and/or its metadata do not exist
      return this.searchPimStorage(parent);
    }

    const hasPimStorageMetadata = metadata!.getAll(RDF.type)
      .some((term): boolean => term.value === PIM.Storage);

    return hasPimStorageMetadata ? identifier : this.searchPimStorage(parent);
  }
}

