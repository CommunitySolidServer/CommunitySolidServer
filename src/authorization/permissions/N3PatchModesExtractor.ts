import type { Operation } from '../../http/Operation';
import type { N3Patch } from '../../http/representation/N3Patch';
import { isN3Patch } from '../../http/representation/N3Patch';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { ModesExtractor } from './ModesExtractor';
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
  public async canHandle({ body }: Operation): Promise<void> {
    if (!isN3Patch(body)) {
      throw new NotImplementedHttpError('Can only determine permissions of N3 Patch documents.');
    }
  }

  public async handle({ body }: Operation): Promise<Set<AccessMode>> {
    const { deletes, inserts, conditions } = body as N3Patch;

    const accessModes = new Set<AccessMode>();

    // When ?conditions is non-empty, servers MUST treat the request as a Read operation.
    if (conditions.length > 0) {
      accessModes.add(AccessMode.read);
    }
    // When ?insertions is non-empty, servers MUST (also) treat the request as an Append operation.
    if (inserts.length > 0) {
      accessModes.add(AccessMode.append);
    }
    // When ?deletions is non-empty, servers MUST treat the request as a Read and Write operation.
    if (deletes.length > 0) {
      accessModes.add(AccessMode.read);
      accessModes.add(AccessMode.write);
    }

    return accessModes;
  }
}
