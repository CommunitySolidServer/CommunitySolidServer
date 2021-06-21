import type { Representation } from '../../ldp/representation/Representation';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import type { RepresentationConverter } from '../conversion/RepresentationConverter';
import type { ResourceStore } from '../ResourceStore';
import type { PatchHandlerArgs } from './PatchHandler';
import { PatchHandler } from './PatchHandler';

/**
 * An abstract patch handler.
 *
 * A `ConvertingPatchHandler` converts a document to its `intermediateType`,
 * handles the patch operation, and then converts back to its original type.
 * This abstract class covers all of the above except of handling the patch operation,
 * for which the abstract `patch` function has to be implemented.
 *
 * In case there is no resource yet and a new one needs to be created,
 * the `patch` function will be called without a Representation
 * and the result will be converted to the `defaultType`.
 */
export abstract class ConvertingPatchHandler extends PatchHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly converter: RepresentationConverter;
  protected readonly intermediateType: string;
  protected readonly defaultType: string;

  /**
   * @param converter - Converter that will be used to generate intermediate Representation.
   * @param intermediateType - Content-type of the intermediate Representation.
   * @param defaultType - Content-type in case a new resource gets created.
   */
  protected constructor(converter: RepresentationConverter, intermediateType: string, defaultType: string) {
    super();
    this.converter = converter;
    this.intermediateType = intermediateType;
    this.defaultType = defaultType;
  }

  public async handle(input: PatchHandlerArgs): Promise<ResourceIdentifier[]> {
    const { source, identifier } = input;
    const { representation, contentType } = await this.toIntermediate(source, identifier);

    const patched = await this.patch(input, representation);

    // Convert back to the original type and write the result
    const converted = await this.converter.handleSafe({
      representation: patched,
      identifier,
      preferences: { type: { [contentType]: 1 }},
    });
    return source.setRepresentation(identifier, converted);
  }

  /**
   * Acquires the resource from the source and converts it to the intermediate type if it was found.
   * Also returns the contentType that should be used when converting back before setting the representation.
   */
  protected async toIntermediate(source: ResourceStore, identifier: ResourceIdentifier):
  Promise<{ representation?: Representation; contentType: string }> {
    let converted: Representation | undefined;
    let contentType: string;
    try {
      const representation = await source.getRepresentation(identifier, {});
      contentType = representation.metadata.contentType!;
      const preferences = { type: { [this.intermediateType]: 1 }};
      converted = await this.converter.handleSafe({ representation, identifier, preferences });
    } catch (error: unknown) {
      // Solid, §5.1: "When a successful PUT or PATCH request creates a resource,
      // the server MUST use the effective request URI to assign the URI to that resource."
      // https://solid.github.io/specification/protocol#resource-type-heuristics
      if (!NotFoundHttpError.isInstance(error)) {
        throw error;
      }
      contentType = this.defaultType;
      this.logger.debug(`Patching new resource ${identifier.path}`);
    }
    return { representation: converted, contentType };
  }

  /**
   * Patch the given representation based on the patch arguments.
   * In case representation is not defined a new Representation should be created.
   * @param input - Arguments that were passed to the initial `handle` call.
   * @param representation - Representation acquired from the source and converted to the intermediate type.
   */
  protected abstract patch(input: PatchHandlerArgs, representation?: Representation): Promise<Representation>;
}
