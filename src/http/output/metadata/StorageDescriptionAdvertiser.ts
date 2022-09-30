import { getLoggerFor } from '../../../logging/LogUtil';
import type { ResourceStore } from '../../../storage/ResourceStore';
import { createErrorMessage } from '../../../util/errors/ErrorUtil';
import { addHeader } from '../../../util/HeaderUtil';
import type { IdentifierStrategy } from '../../../util/identifiers/IdentifierStrategy';
import { joinUrl } from '../../../util/PathUtil';
import { LDP, PIM, RDF, SOLID } from '../../../util/Vocabularies';
import type { TargetExtractor } from '../../input/identifier/TargetExtractor';
import type { ResourceIdentifier } from '../../representation/ResourceIdentifier';
import type { MetadataWriterInput } from './MetadataWriter';
import { MetadataWriter } from './MetadataWriter';

/**
 * Adds a link header pointing to the relevant storage description resource.
 * Recursively checks parent containers until a storage container is found,
 * and then appends the provided suffix to determine the storage description resource.
 */
export class StorageDescriptionAdvertiser extends MetadataWriter {
  protected readonly logger = getLoggerFor(this);

  private readonly targetExtractor: TargetExtractor;
  private readonly identifierStrategy: IdentifierStrategy;
  private readonly store: ResourceStore;
  private readonly suffix: string;

  public constructor(targetExtractor: TargetExtractor, identifierStrategy: IdentifierStrategy, store: ResourceStore,
    suffix: string) {
    super();
    this.identifierStrategy = identifierStrategy;
    this.targetExtractor = targetExtractor;
    this.store = store;
    this.suffix = suffix;
  }

  public async handle({ response, metadata }: MetadataWriterInput): Promise<void> {
    // This indicates this is the response of a successful GET/HEAD request
    if (!metadata.has(RDF.terms.type, LDP.terms.Resource)) {
      return;
    }
    const identifier = { path: metadata.identifier.value };
    let storageRoot: ResourceIdentifier;
    try {
      storageRoot = await this.findStorageRoot(identifier);
    } catch (error: unknown) {
      this.logger.error(`Unable to find storage root: ${createErrorMessage(error)}`);
      return;
    }
    const storageDescription = joinUrl(storageRoot.path, this.suffix);
    addHeader(response, 'Link', `<${storageDescription}>; rel="${SOLID.storageDescription}"`);
  }

  private async findStorageRoot(identifier: ResourceIdentifier): Promise<ResourceIdentifier> {
    const representation = await this.store.getRepresentation(identifier, {});
    // We only need the metadata
    representation.data.destroy();
    if (representation.metadata.has(RDF.terms.type, PIM.terms.Storage)) {
      return identifier;
    }
    return this.findStorageRoot(this.identifierStrategy.getParentContainer(identifier));
  }
}
