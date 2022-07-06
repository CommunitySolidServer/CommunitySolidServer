import type { Representation } from '../../http/representation/Representation';
import { getLoggerFor } from '../../logging/LogUtil';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
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

  private readonly patcher: RepresentationPatcher;

  public constructor(patcher: RepresentationPatcher) {
    super();
    this.patcher = patcher;
  }

  public async handle({ source, patch, identifier }: PatchHandlerInput): Promise<ChangeMap> {
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

    // Patch it
    const patched = await this.patcher.handleSafe({ patch, identifier, representation });

    // Write it back to the store
    return source.setRepresentation(identifier, patched);
  }
}
