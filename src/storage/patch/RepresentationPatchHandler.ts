import type { Representation } from '../../http/representation/Representation';
import { getLoggerFor } from '../../logging/LogUtil';
import { INTERNAL_ALL } from '../../util/ContentTypes';
import { ConflictHttpError } from '../../util/errors/ConflictHttpError';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import { isContainerIdentifier } from '../../util/PathUtil';
import type { ChangeMap } from '../ResourceStore';
import type { PatchHandlerInput } from './PatchHandler';
import { PatchHandler } from './PatchHandler';
import type { RepresentationPatcher } from './RepresentationPatcher';

/**
 * Handles a patch operation by getting the representation from the store, applying a `RepresentationPatcher`,
 * and then writing the result back to the store.
 *
 * In case there is no original representation (the store throws a `NotFoundHttpError`),
 * the patcher is expected to create a new one.
 */
export class RepresentationPatchHandler extends PatchHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly patcher: RepresentationPatcher<Representation>;

  public constructor(patcher: RepresentationPatcher<Representation>) {
    super();
    this.patcher = patcher;
  }

  public async handle({ source, patch, identifier }: PatchHandlerInput): Promise<ChangeMap> {
    // Get the representation from the store
    let representation: Representation | undefined;
    try {
      // Internal types are converted unless specified otherwise like we do here
      // eslint-disable-next-line ts/naming-convention
      representation = await source.getRepresentation(identifier, { type: { '*/*': 1, [INTERNAL_ALL]: 1 }});
    } catch (error: unknown) {
      // Solid, §5.1: "When a successful PUT or PATCH request creates a resource,
      // the server MUST use the effective request URI to assign the URI to that resource."
      // https://solid.github.io/specification/protocol#resource-type-heuristics
      if (!NotFoundHttpError.isInstance(error)) {
        throw error;
      }
      this.logger.debug(`Patching new resource ${identifier.path}`);
    }

    // Patch it
    const patched = await this.patcher.handleSafe({ patch, identifier, representation });

    // Solid, §5.3: "Servers MUST NOT allow HTTP PUT or PATCH on a container to update its containment triples;
    // if the server receives such a request, it MUST respond with a 409 status code."
    if (isContainerIdentifier(identifier)) {
      throw new ConflictHttpError('Not allowed to execute PATCH requests on containers.');
    }

    // Write it back to the store
    return source.setRepresentation(identifier, patched);
  }
}
