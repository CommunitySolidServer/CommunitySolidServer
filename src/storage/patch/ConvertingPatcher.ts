import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import { getLoggerFor } from '../../logging/LogUtil';
import type { RepresentationConverter } from '../conversion/RepresentationConverter';
import type { RepresentationPatcherInput } from './RepresentationPatcher';
import { RepresentationPatcher } from './RepresentationPatcher';

/**
 * A `ConvertingPatcher` converts a document to its `intermediateType`,
 * sends the result to the wrapped patcher, and then converts back to its original type.
 * No changes will take place if no `intermediateType` is provided.
 *
 * In case there is no resource yet and a new one needs to be created,
 * the result of the wrapped patcher will be converted to the provided `defaultType`.
 * In case no `defaultType` is provided, the patcher output will be returned directly.
 */
export class ConvertingPatcher extends RepresentationPatcher<Representation> {
  protected readonly logger = getLoggerFor(this);

  private readonly patcher: RepresentationPatcher<Representation>;
  private readonly converter: RepresentationConverter;
  private readonly intermediateType?: string;
  private readonly defaultType?: string;

  /**
   * @param patcher - Patcher that will be called with the Representation.
   * @param converter - Converter that will be used to generate intermediate Representation.
   * @param intermediateType - Content-type of the intermediate Representation if conversion is needed.
   * @param defaultType - Content-type in case a new resource gets created and needs to be converted.
   */
  public constructor(
    patcher: RepresentationPatcher<Representation>,
    converter: RepresentationConverter,
    intermediateType?: string,
    defaultType?: string,
  ) {
    super();
    this.patcher = patcher;
    this.converter = converter;
    this.intermediateType = intermediateType;
    this.defaultType = defaultType;
  }

  public async canHandle(input: RepresentationPatcherInput<Representation>): Promise<void> {
    // Verify the converter can handle the input representation if needed
    const { identifier, representation } = input;
    let convertedPlaceholder = representation;
    if (representation && this.intermediateType) {
      const preferences = { type: { [this.intermediateType]: 1 }};
      await this.converter.canHandle({ representation, identifier, preferences });
      convertedPlaceholder = new BasicRepresentation([], representation.metadata, this.intermediateType);
    }

    // Verify the patcher can handle the (converted) representation
    await this.patcher.canHandle({ ...input, representation: convertedPlaceholder });
  }

  public async handle(input: RepresentationPatcherInput<Representation>): Promise<Representation> {
    const { identifier, representation } = input;
    let outputType: string | undefined;
    let converted = representation;
    if (!representation) {
      // If there is no representation the output will need to be converted to the default type
      outputType = this.defaultType;
    } else if (this.intermediateType) {
      // Convert incoming representation to the requested type
      outputType = representation.metadata.contentType;
      const preferences = { type: { [this.intermediateType]: 1 }};
      converted = await this.converter.handle({ representation, identifier, preferences });
    }

    // Call the wrapped patcher with the (potentially) converted representation
    let result = await this.patcher.handle({ ...input, representation: converted });

    // Convert the output back to its original type or the default type depending on what was set
    if (outputType) {
      const preferences = { type: { [outputType]: 1 }};
      result = await this.converter.handle({ representation: result, identifier, preferences });
    }

    return result;
  }
}
