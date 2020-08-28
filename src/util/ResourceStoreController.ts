import { RuntimeConfig } from '../init/RuntimeConfig';
import { Representation } from '../ldp/representation/Representation';
import { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { ConflictHttpError } from './errors/ConflictHttpError';
import { MethodNotAllowedHttpError } from './errors/MethodNotAllowedHttpError';
import { NotFoundHttpError } from './errors/NotFoundHttpError';
import { InteractionController } from './InteractionController';
import { ensureLeadingSlash, ensureTrailingSlash, trimTrailingSlashes } from './Util';

export interface SetBehaviour {
  /**
   * Whether a new container or a resource should be created based on the given parameters.
   */
  isContainer: boolean;

  /**
   * The parent identifier path of the new resource.
   */
  path: string;

  /**
   * The identifier path the new resource should have.
   */
  newIdentifier: string;
}

export class ResourceStoreController {
  private readonly runtimeConfig: RuntimeConfig;
  private readonly interactionController: InteractionController;

  /**
   * @param runtimeConfig - Config containing base that will be stripped of all incoming URIs
   *                        and added to all outgoing ones to find the relative path.
   * @param interactionController - Instance of InteractionController to use.
   */
  public constructor(runtimeConfig: RuntimeConfig, interactionController: InteractionController) {
    this.runtimeConfig = runtimeConfig;
    this.interactionController = interactionController;
  }

  /**
   * Strips the baseRequestURI from the identifier and checks if the stripped base URI matches the store's one.
   * @param identifier - Incoming identifier.
   *
   * @throws {@link NotFoundHttpError}
   * If the identifier does not match the baseRequestURI path of the store.
   *
   * @returns A string representing the relative path.
   */
  public parseIdentifier(identifier: ResourceIdentifier): string {
    if (!identifier.path.startsWith(trimTrailingSlashes(this.runtimeConfig.base))) {
      throw new NotFoundHttpError();
    }
    const path = identifier.path.slice(this.runtimeConfig.base.length);
    if (path === '') {
      return '/';
    }
    return path;
  }

  /**
   * Check if the given path is a valid path to perform a delete operation on.
   * @param path - Path to check. Request URI without the base URI.
   *
   * @throws {@link MethodNotAllowedHttpError}
   * If the path points to the root container.
   */
  public validateDeletePath(path: string): void {
    if (path === '' || ensureTrailingSlash(path) === '/') {
      throw new MethodNotAllowedHttpError('Cannot delete root container.');
    }
  }

  /**
   * Get the expected behaviour based on the incoming identifier and representation for a POST request.
   * @param container - Incoming identifier.
   * @param representation - Incoming representation.
   */
  public getBehaviourAddResource(container: ResourceIdentifier, representation: Representation): SetBehaviour {
    // Get the path from the request URI, and the Slug and Link header values.
    const path = ensureLeadingSlash(this.parseIdentifier(container));
    const { slug } = representation.metadata;
    const linkTypes = representation.metadata.linkRel?.type;

    const isContainer = this.interactionController.isContainer(slug, linkTypes);
    const newIdentifier = this.interactionController.generateIdentifier(isContainer, slug);

    return { isContainer, path, newIdentifier };
  }

  /**
   * Get the expected behaviour based on the incoming identifier and representation for a PUT request.
   * @param identifier - Incoming identifier.
   * @param representation - Incoming representation.
   */
  public getBehaviourSetRepresentation(identifier: ResourceIdentifier, representation: Representation): SetBehaviour {
    // Break up the request URI in the different parts `path` and `slug` as we know their semantics from addResource
    // to call the InteractionController in the same way.
    const [ , path, slug ] = /^(.*\/)([^/]+\/?)$/u.exec(ensureLeadingSlash(this.parseIdentifier(identifier))) ?? [];
    if ((typeof path !== 'string' || ensureTrailingSlash(path) === '/') && typeof slug !== 'string') {
      throw new ConflictHttpError('Container with that identifier already exists (root).');
    }

    // Get the Link header value.
    const linkTypes = representation.metadata.linkRel?.type;

    const isContainer = this.interactionController.isContainer(slug, linkTypes);
    const newIdentifier = this.interactionController.generateIdentifier(isContainer, slug);

    return { isContainer, path, newIdentifier };
  }
}
