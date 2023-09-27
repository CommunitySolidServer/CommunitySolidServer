import { Util } from 'n3';
import type { MetadataWriterInput } from '../../../../http/output/metadata/MetadataWriter';
import { MetadataWriter } from '../../../../http/output/metadata/MetadataWriter';
import type { ResourceIdentifier } from '../../../../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../../../../logging/LogUtil';
import type { StorageLocationStrategy } from '../../../../server/description/StorageLocationStrategy';
import { createErrorMessage } from '../../../../util/errors/ErrorUtil';
import { addHeader } from '../../../../util/HeaderUtil';
import type { PodStore } from './PodStore';
import isBlankNode = Util.isBlankNode;

/**
 * Adds link headers indicating who the owners are when accessing the base URL of a pod.
 * Only owners that have decided to be visible will be shown.
 *
 * Solid, §4.1: "When a server wants to advertise the owner of a storage,
 * the server MUST include the Link header with rel="http://www.w3.org/ns/solid/terms#owner"
 * targeting the URI of the owner in the response of HTTP HEAD or GET requests targeting the root container."
 * https://solidproject.org/TR/2022/protocol-20221231#server-storage-link-owner
 */
export class OwnerMetadataWriter extends MetadataWriter {
  protected logger = getLoggerFor(this);

  protected podStore: PodStore;
  protected storageStrategy: StorageLocationStrategy;

  public constructor(podStore: PodStore, storageStrategy: StorageLocationStrategy) {
    super();
    this.podStore = podStore;
    this.storageStrategy = storageStrategy;
  }

  public async handle({ metadata, response }: MetadataWriterInput): Promise<void> {
    // Doing all checks here instead of in `canHandle` as this is currently used in a ParallelHandler,
    // which doesn't correctly check the canHandle/handle combination.
    if (isBlankNode(metadata.identifier)) {
      // Blank nodes indicate errors
      this.logger.debug('Skipping owner link headers as metadata identifier is a blank node.');
      return;
    }
    const identifier = { path: metadata.identifier.value };

    let storageIdentifier: ResourceIdentifier;
    try {
      storageIdentifier = await this.storageStrategy.getStorageIdentifier(identifier);
    } catch (error: unknown) {
      this.logger
        .debug(`Skipping owner link headers as no storage identifier could be found: ${createErrorMessage(error)}`);
      return;
    }

    // Only need to expose headers when requesting the base URl of the pod
    if (identifier.path !== storageIdentifier.path) {
      return;
    }

    const pod = await this.podStore.findByBaseUrl(identifier.path);
    if (!pod) {
      this.logger.debug(`No pod object found for base URL ${identifier.path}`);
      return;
    }

    const owners = await this.podStore.getOwners(pod.id);
    if (!owners) {
      this.logger.error(`Unable to find owners for pod ${identifier.path}`);
      return;
    }

    for (const { webId, visible } of owners) {
      if (visible) {
        addHeader(response, 'Link', `<${webId}>; rel="http://www.w3.org/ns/solid/terms#owner"`);
      }
    }
  }
}
