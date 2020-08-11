import { ensureTrailingSlash } from './Util';
import { uuid } from 'uuidv4';
import { LINK_TYPE_LDP_BC, LINK_TYPE_LDP_C } from './LinkTypes';

export enum RequestAction {
  CREATE_CONTAINER,
  CREATE_RESOURCE
}

export class InteractionHandler {
  public static result = class {
    /**
     * Path of all containers
     */
    public parentContainer!: string;
    public newIdentifier!: string;
    public requestAction!: RequestAction;
  };

  /**
   * Get the corresponding action with the given parameters.
   * @param requestURI - Incoming URI of the request.
   * @param slug - Incoming slug header.
   * @param link - Incoming link header.
   */
  public getResultingAction(requestURI: string, slug?: string,
    link?: string): InstanceType<typeof InteractionHandler.result> {
    let container = requestURI;
    container = ensureTrailingSlash(container);
    if (!container.startsWith('/')) {
      container = `/${container}`;
    }
    if (!slug) {
      // Slug type: none
      if (link && (link.includes(LINK_TYPE_LDP_C) || link.includes(LINK_TYPE_LDP_BC))) {
        // Create a container with server determined identifier appended to the request-URI.
        return {
          parentContainer: container,
          newIdentifier: `${uuid()}/`,
          requestAction: RequestAction.CREATE_CONTAINER,
        };
      }

      // Create a resource with server determined identifier appended to the request-URI, check for consistency
      return { parentContainer: container, newIdentifier: uuid(), requestAction: RequestAction.CREATE_RESOURCE };
    }
    if (slug.endsWith('/')) {
      // Slug type: `foo/`
      if (!link || link.includes(LINK_TYPE_LDP_C) || link.includes(LINK_TYPE_LDP_BC)) {
        // Create a container with foo/ appended to the request-URI.
        return {
          parentContainer: container,
          newIdentifier: slug,
          requestAction: RequestAction.CREATE_CONTAINER,
        };
      }

      // Create a resource with foo appended to the request-URI, but check for consistency.
      return {
        parentContainer: container,
        newIdentifier: slug.slice(0, -1),
        requestAction: RequestAction.CREATE_RESOURCE,
      };
    }

    // Slug type: `foo`
    if (link && (link.includes(LINK_TYPE_LDP_C) || link.includes(LINK_TYPE_LDP_BC))) {
      // Create a container with foo/ appended to the request-URI.
      return { parentContainer: container, newIdentifier: `${slug}/`, requestAction: RequestAction.CREATE_CONTAINER };
    }

    // Create a resource with foo appended to the request-URI, check for consistency
    return { parentContainer: container, newIdentifier: slug, requestAction: RequestAction.CREATE_RESOURCE };
  }
}
