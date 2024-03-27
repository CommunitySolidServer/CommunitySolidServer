import type { Operation } from '../../http/Operation';
import type { ResourceSet } from '../../storage/ResourceSet';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { IdentifierSetMultiMap } from '../../util/map/IdentifierMap';
import { isContainerIdentifier } from '../../util/PathUtil';
import { ModesExtractor } from './ModesExtractor';
import type { AccessMap } from './Permissions';
import { AccessMode } from './Permissions';

const READ_METHODS = new Set([ 'OPTIONS', 'GET', 'HEAD' ]);
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
   *
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

  public async handle({ method, target }: Operation): Promise<AccessMap> {
    const requiredModes: AccessMap = new IdentifierSetMultiMap();
    // Reading requires Read permissions on the resource
    if (READ_METHODS.has(method)) {
      requiredModes.add(target, AccessMode.read);
    }
    if (method === 'PUT') {
      if (await this.resourceSet.hasResource(target)) {
        // Replacing a resource's representation with PUT requires Write permissions
        requiredModes.add(target, AccessMode.write);
      } else {
        // ... while creating a new resource with PUT requires Append and Create permissions.
        requiredModes.add(target, AccessMode.append);
        requiredModes.add(target, AccessMode.create);
      }
    }
    // Creating a new resource in a container requires Append access to that container
    if (method === 'POST') {
      requiredModes.add(target, AccessMode.append);
    }
    // Deleting a resource requires Delete access
    if (method === 'DELETE') {
      requiredModes.add(target, AccessMode.delete);
      // …and, if the target is a container, Read permissions are required as well
      // as this exposes if a container is empty or not
      if (isContainerIdentifier(target)) {
        requiredModes.add(target, AccessMode.read);
      }
    }
    return requiredModes;
  }
}
