import type { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import type { IdentifierStrategy } from '../../util/identifiers/IdentifierStrategy';
import { PIM, RDF } from '../../util/Vocabularies';
import type { DataAccessor } from '../accessors/DataAccessor';
import type { Size } from '../size-reporter/Size';
import type { SizeReporter } from '../size-reporter/SizeReporter';
import { QuotaStrategy } from './QuotaStrategy';

/**
 * The PodQuotaStrategy sets a limit on the amount of data stored on a per pod basis
 */
export class PodQuotaStrategy extends QuotaStrategy {
  private readonly identifierStrategy: IdentifierStrategy;
  private readonly accessor: DataAccessor;

  public constructor(
    limit: Size,
    reporter: SizeReporter<unknown>,
    identifierStrategy: IdentifierStrategy,
    accessor: DataAccessor,
  ) {
    super(reporter, limit);
    this.identifierStrategy = identifierStrategy;
    this.accessor = accessor;
  }

  protected async getTotalSpaceUsed(identifier: ResourceIdentifier): Promise<Size> {
    const pimStorage = await this.searchPimStorage(identifier);

    // No storage was found containing this identifier, so we assume this identifier points to an internal location.
    // Quota does not apply here so there is always available space.
    if (!pimStorage) {
      return { amount: Number.MAX_SAFE_INTEGER, unit: this.limit.unit };
    }

    return this.reporter.getSize(pimStorage);
  }

  /** Finds the closest parent container that has pim:storage as metadata */
  private async searchPimStorage(identifier: ResourceIdentifier): Promise<ResourceIdentifier | undefined> {
    if (this.identifierStrategy.isRootContainer(identifier)) {
      return;
    }

    let metadata: RepresentationMetadata;
    const parent = this.identifierStrategy.getParentContainer(identifier);

    try {
      metadata = await this.accessor.getMetadata(identifier);
    } catch (error: unknown) {
      if (error instanceof NotFoundHttpError) {
        // Resource and/or its metadata do not exist
        return this.searchPimStorage(parent);
      }
      throw error;
    }

    const hasPimStorageMetadata = metadata!.getAll(RDF.terms.type)
      .some((term): boolean => term.value === PIM.Storage);

    return hasPimStorageMetadata ? identifier : this.searchPimStorage(parent);
  }
}
