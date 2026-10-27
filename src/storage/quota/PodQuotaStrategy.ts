import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import type { IdentifierStrategy } from '../../util/identifiers/IdentifierStrategy';
import { joinUrl, trimTrailingSlashes } from '../../util/PathUtil';
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
  /** Full URL of the CSS-internal storage container (e.g. `https://host/.internal/`). */
  private readonly internalFolder: string;

  public constructor(
    limit: Size,
    reporter: SizeReporter<unknown>,
    identifierStrategy: IdentifierStrategy,
    accessor: DataAccessor,
    baseUrl: string,
    internalFolder = '/.internal/',
  ) {
    super(reporter, limit);
    this.identifierStrategy = identifierStrategy;
    this.accessor = accessor;
    // Joined with the base URL so this also works when the base URL has a path
    // prefix (e.g. `https://host/my-server/` -> `https://host/my-server/.internal/`).
    this.internalFolder = trimTrailingSlashes(joinUrl(baseUrl, internalFolder));
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

  /**
   * Finds the closest parent container that has `pim:storage` as metadata.
   * The metadata is read BEFORE the root-container stop, because in subdomain
   * mode every pod root IS a root container, and a root container can be a pod.
   */
  private async searchPimStorage(identifier: ResourceIdentifier): Promise<ResourceIdentifier | undefined> {
    // CSS-internal storage (locks, IDP adapter, temp files, accounts, ...) is
    // never part of a pod — quota does not apply to it. This also prevents the
    // base root (which can itself be marked as a storage, e.g.
    // `RootStorageLocationStrategy`) from being treated as a pod for internal
    // writes.
    if (this.isInternalPath(identifier)) {
      return;
    }

    try {
      const metadata = await this.accessor.getMetadata(identifier);
      if (metadata.getAll(RDF.terms.type).some((term): boolean => term.value === PIM.Storage)) {
        return identifier;
      }
    } catch (error: unknown) {
      // Resource and/or its metadata do not exist — keep walking up below.
      if (!(error instanceof NotFoundHttpError)) {
        throw error;
      }
    }

    // Not a storage (or it does not exist) — keep walking up.
    return this.searchParentStorage(identifier);
  }

  /**
   * Continues the search in the parent container, unless the identifier is a
   * root container (nothing above it can be a pod).
   */
  private async searchParentStorage(identifier: ResourceIdentifier): Promise<ResourceIdentifier | undefined> {
    if (this.identifierStrategy.isRootContainer(identifier)) {
      return;
    }
    return this.searchPimStorage(this.identifierStrategy.getParentContainer(identifier));
  }

  /** Whether the identifier points into the configured CSS-internal storage. */
  private isInternalPath(identifier: ResourceIdentifier): boolean {
    const path = trimTrailingSlashes(identifier.path);
    return path === this.internalFolder || path.startsWith(`${this.internalFolder}/`);
  }
}
