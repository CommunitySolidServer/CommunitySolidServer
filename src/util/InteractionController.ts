import type { Term } from 'rdf-js';
import { v4 as uuid } from 'uuid';
import { LDP } from './UriConstants';
import { trimTrailingSlashes } from './Util';

export class InteractionController {
  /**
   * Check whether a new container or a resource should be created based on the given parameters.
   * @param slug - Incoming slug metadata.
   * @param types - Incoming type metadata.
   */
  public isContainer(slug?: string, types?: Term[]): boolean {
    if (types && types.length > 0) {
      return types.some((type): boolean => type.value === LDP.Container || type.value === LDP.BasicContainer);
    }
    return Boolean(slug?.endsWith('/'));
  }

  /**
   * Get the identifier path the new resource should have.
   * @param isContainer - Whether or not the resource is a container.
   * @param slug - Incoming slug metadata.
   */
  public generateIdentifier(isContainer: boolean, slug?: string): string {
    if (!slug) {
      return `${uuid()}${isContainer ? '/' : ''}`;
    }
    return `${trimTrailingSlashes(slug)}${isContainer ? '/' : ''}`;
  }
}
