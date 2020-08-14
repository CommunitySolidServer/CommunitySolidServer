import { trimTrailingSlashes } from './Util';
import { v4 as uuid } from 'uuid';
import { LINK_TYPE_LDP_BC, LINK_TYPE_LDPC } from './LinkTypes';

export class InteractionController {
  /**
   * Check whether a new container or a resource should be created based on the given parameters.
   * @param slug - Incoming slug header.
   * @param link - Incoming link header.
   */
  public isContainer(slug?: string, link?: Set<string>): boolean {
    if (!slug || !slug.endsWith('/')) {
      return link !== undefined && (link.has(LINK_TYPE_LDPC) || link.has(LINK_TYPE_LDP_BC));
    }
    return !link || link.has(LINK_TYPE_LDPC) || link.has(LINK_TYPE_LDP_BC);
  }

  /**
   * Get the identifier path the new resource should have.
   * @param isContainer - Whether or not the resource is a container.
   * @param slug - Incoming slug header.
   */
  public generateIdentifier(isContainer: boolean, slug?: string): string {
    if (!slug) {
      return String(uuid()) + (isContainer ? '/' : '');
    }
    return trimTrailingSlashes(slug) + (isContainer ? '/' : '');
  }
}
