import { getLoggerFor } from '../../../logging/LogUtil';
import type { StorageLocationStrategy } from '../../../server/description/StorageLocationStrategy';
import { createErrorMessage } from '../../../util/errors/ErrorUtil';
import { addHeader } from '../../../util/HeaderUtil';
import { joinUrl } from '../../../util/PathUtil';
import { LDP, RDF, SOLID } from '../../../util/Vocabularies';
import type { ResourceIdentifier } from '../../representation/ResourceIdentifier';
import type { MetadataWriterInput } from './MetadataWriter';
import { MetadataWriter } from './MetadataWriter';

/**
 * Adds a link header pointing to the relevant storage description resource.
 * Recursively checks parent containers until a storage container is found,
 * and then appends the provided relative path to determine the storage description resource.
 */
export class StorageDescriptionAdvertiser extends MetadataWriter {
  protected readonly logger = getLoggerFor(this);

  private readonly storageStrategy: StorageLocationStrategy;
  private readonly relativePath: string;

  public constructor(storageStrategy: StorageLocationStrategy, relativePath: string) {
    super();
    this.storageStrategy = storageStrategy;
    this.relativePath = relativePath;
  }

  public async handle({ response, metadata }: MetadataWriterInput): Promise<void> {
    // This indicates this is the response of a successful GET/HEAD request
    if (!metadata.has(RDF.terms.type, LDP.terms.Resource)) {
      return;
    }
    const identifier = { path: metadata.identifier.value };
    let storageRoot: ResourceIdentifier;
    try {
      storageRoot = await this.storageStrategy.getStorageIdentifier(identifier);
      this.logger.debug(`Found storage root ${storageRoot.path}`);
    } catch (error: unknown) {
      this.logger.error(`Unable to find storage root: ${createErrorMessage(error)
      }. The storage/location import in the server configuration is probably wrong.`);
      return;
    }
    const storageDescription = joinUrl(storageRoot.path, this.relativePath);
    addHeader(response, 'Link', `<${storageDescription}>; rel="${SOLID.storageDescription}"`);
  }
}
