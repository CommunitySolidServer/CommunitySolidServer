import type { AuxiliaryStrategy } from '../../http/auxiliary/AuxiliaryStrategy';
import type { Representation } from '../../http/representation/Representation';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import { ConflictHttpError } from '../../util/errors/ConflictHttpError';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import { isContainerIdentifier } from '../../util/PathUtil';
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

  private readonly patcher: RepresentationPatcher;
  private readonly metaStrategy: AuxiliaryStrategy;

  public constructor(patcher: RepresentationPatcher, metaStrategy: AuxiliaryStrategy) {
    super();
    this.patcher = patcher;
    this.metaStrategy = metaStrategy;
  }

  public async handle({ source, patch, identifier }: PatchHandlerInput): Promise<ResourceIdentifier[]> {
    // Get the representation from the store
    let representation: Representation | undefined;
    try {
      representation = await source.getRepresentation(identifier, {});
    } catch (error: unknown) {
      // Solid, §5.1: "When a successful PUT or PATCH request creates a resource,
      // the server MUST use the effective request URI to assign the URI to that resource."
      // https://solid.github.io/specification/protocol#resource-type-heuristics
      if (!NotFoundHttpError.isInstance(error)) {
        throw error;
      }
      this.logger.debug(`Patching new resource ${identifier.path}`);
    }

    const metadata = this.metaStrategy.isAuxiliaryIdentifier(identifier);
    // Patch it
    const patched = await this.patcher.handleSafe({ patch, identifier, representation, metadata });

    // Solid, §5.3: "Servers MUST NOT allow HTTP POST, PUT and PATCH to update a container’s resource metadata
    // statements; if the server receives such a request, it MUST respond with a 409 status code.
    // https://solid.github.io/specification/protocol#contained-resource-metadata-statements
    if (isContainerIdentifier(identifier)) {
      throw new ConflictHttpError('Not allowed to execute PATCH request on containers.');
    }

    // Write it back to the store
    return source.setRepresentation(identifier, patched);
  }
}
