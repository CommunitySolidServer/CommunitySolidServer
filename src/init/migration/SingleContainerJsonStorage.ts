import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { JsonResourceStorage } from '../../storage/keyvalue/JsonResourceStorage';
import { createErrorMessage } from '../../util/errors/ErrorUtil';
import { isContainerIdentifier } from '../../util/PathUtil';
import { readableToString } from '../../util/StreamUtil';
import { LDP } from '../../util/Vocabularies';

/**
 * A variant of a {@link JsonResourceStorage} where the `entries()` call
 * does not recursively iterate through all containers.
 * Only the documents that are found in the root container are returned.
 *
 * This class was created to support migration where different storages are nested in one main `.internal` container,
 * and we specifically want to only return entries of one storage.
 */
export class SingleContainerJsonStorage<T> extends JsonResourceStorage<T> {
  protected async* getResourceEntries(containerId: ResourceIdentifier): AsyncIterableIterator<[string, T]> {
    const container = await this.safelyGetResource(containerId);
    if (!container) {
      return;
    }

    // Only need the metadata
    container.data.destroy();
    const members = container.metadata.getAll(LDP.terms.contains).map((term): string => term.value);

    for (const path of members) {
      const documentId = { path };
      if (isContainerIdentifier(documentId)) {
        continue;
      }

      const document = await this.safelyGetResource(documentId);
      if (!document) {
        continue;
      }

      const key = this.identifierToKey(documentId);
      try {
        const json = JSON.parse(await readableToString(document.data)) as T;
        yield [ key, json ];
      } catch (error: unknown) {
        this.logger.error(`Unable to parse ${path}. You should probably delete this resource manually. Error: ${
          createErrorMessage(error)}`);
      }
    }
  }
}
