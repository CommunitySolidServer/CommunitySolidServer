import { uuid } from 'uuidv4';
import { ensureLeadingSlash, ensureTrailingSlash, trimTrailingSlashes } from './Util';
import { LINK_TYPE_LDP_BC, LINK_TYPE_LDPC } from './LinkTypes';

export class InteractionController {
  /**
   * Check whether a new container or a resource should be created based on the given parameters.
   * @param slug - Incoming slug header.
   * @param link - Incoming link header.
   */
  public isContainer(slug?: string, link?: Set<string>): boolean {
    if (!slug) {
      return link !== undefined && (link.has(LINK_TYPE_LDPC) || link.has(LINK_TYPE_LDP_BC));
    }
    if (slug.endsWith('/')) {
      return !link || link.has(LINK_TYPE_LDPC) || link.has(LINK_TYPE_LDP_BC);
    }
    return link !== undefined && (link.has(LINK_TYPE_LDPC) || link.has(LINK_TYPE_LDP_BC));
  }

  /**
   * Get the identifier path the new resource should have.
   * @param isContainer - Whether or not the resource is a container.
   * @param slug - Incoming slug header.
   */
  public generateIdentifier(isContainer: boolean, slug?: string): string {
    if (!slug) {
      return uuid() + (isContainer ? '/' : '');
    }
    return trimTrailingSlashes(slug) + (isContainer ? '/' : '');
  }

  /**
   * Makes sure that the input path has exactly 1 slash at the beginning and ending.
   * @param requestURI - Incoming URI of the request.
   */
  public getContainer(requestURI: string): string {
    return ensureLeadingSlash(ensureTrailingSlash(requestURI));
  }
}
