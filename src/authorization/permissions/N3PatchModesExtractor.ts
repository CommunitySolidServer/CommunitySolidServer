import type { Operation } from '../../http/Operation';
import type { N3Patch } from '../../http/representation/N3Patch';
import { isN3Patch } from '../../http/representation/N3Patch';
import type { ResourceSet } from '../../storage/ResourceSet';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { IdentifierSetMultiMap } from '../../util/map/IdentifierMap';
import { ModesExtractor } from './ModesExtractor';
import type { AccessMap } from './Permissions';
import { AccessMode } from './Permissions';

/**
 * Extracts the required access modes from an N3 Patch.
 *
 * Solid, §5.3.1: "When ?conditions is non-empty, servers MUST treat the request as a Read operation.
 * When ?insertions is non-empty, servers MUST (also) treat the request as an Append operation.
 * When ?deletions is non-empty, servers MUST treat the request as a Read and Write operation."
 * https://solid.github.io/specification/protocol#n3-patch
 */
export class N3PatchModesExtractor extends ModesExtractor {
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

  public async canHandle({ body }: Operation): Promise<void> {
    if (!isN3Patch(body)) {
      throw new NotImplementedHttpError('Can only determine permissions of N3 Patch documents.');
    }
  }

  public async handle({ body, target }: Operation): Promise<AccessMap> {
    const { deletes, inserts, conditions } = body as N3Patch;

    const requiredModes: AccessMap = new IdentifierSetMultiMap();

    // When ?conditions is non-empty, servers MUST treat the request as a Read operation.
    if (conditions.length > 0) {
      requiredModes.add(target, AccessMode.read);
    }
    // When ?insertions is non-empty, servers MUST (also) treat the request as an Append operation.
    if (inserts.length > 0) {
      requiredModes.add(target, AccessMode.append);
      if (!await this.resourceSet.hasResource(target)) {
        requiredModes.add(target, AccessMode.create);
      }
    }
    // When ?deletions is non-empty, servers MUST treat the request as a Read and Write operation.
    if (deletes.length > 0) {
      requiredModes.add(target, AccessMode.read);
      requiredModes.add(target, AccessMode.write);
    }

    return requiredModes;
  }
}
