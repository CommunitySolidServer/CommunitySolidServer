import type { Operation } from '../../http/Operation';
import type { ResourceSet } from '../../storage/ResourceSet';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { isContainerIdentifier } from '../../util/PathUtil';
import { ModesExtractor } from './ModesExtractor';
import { AccessMode } from './Permissions';

const READ_METHODS = new Set([ 'GET', 'HEAD' ]);
const SUPPORTED_METHODS = new Set([ ...READ_METHODS, 'PUT', 'POST', 'DELETE' ]);

/**
 * Generates permissions for the base set of methods that always require the same permissions.
 * Specifically: GET, HEAD, POST, PUT and DELETE.
 */
export class MethodModesExtractor extends ModesExtractor {
  private readonly resourceSet: ResourceSet;

  /**
   * Certain permissions depend on the existence of the target resource.
   * The provided {@link ResourceSet} will be used for that.
   * @param resourceSet - {@link ResourceSet} that can verify the target resource existence.
   */
  public constructor(resourceSet: ResourceSet) {
    super();
    this.resourceSet = resourceSet;
  }

  public async canHandle({ method }: Operation): Promise<void> {
    if (!SUPPORTED_METHODS.has(method)) {
      throw new NotImplementedHttpError(`Cannot determine permissions of ${method}`);
    }
  }

  public async handle({ method, target }: Operation): Promise<Set<AccessMode>> {
    const modes = new Set<AccessMode>();
    // Reading requires Read permissions on the resource
    if (READ_METHODS.has(method)) {
      modes.add(AccessMode.read);
    }
    // Setting a resource's representation requires Write permissions
    if (method === 'PUT') {
      modes.add(AccessMode.write);
      // …and, if the resource does not exist yet, Create permissions are required as well
      if (!await this.resourceSet.hasResource(target)) {
        modes.add(AccessMode.create);
      }
    }
    // Creating a new resource in a container requires Append access to that container
    if (method === 'POST') {
      modes.add(AccessMode.append);
    }
    // Deleting a resource requires Delete access
    if (method === 'DELETE') {
      modes.add(AccessMode.delete);
      // …and, if the target is a container, Read permissions are required as well
      // as this exposes if a container is empty or not
      if (isContainerIdentifier(target)) {
        modes.add(AccessMode.read);
      }
    }
    return modes;
  }
}
