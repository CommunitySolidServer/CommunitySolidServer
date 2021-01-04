import type { Representation } from '../ldp/representation/Representation';
import type { RepresentationPreferences } from '../ldp/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import { InternalServerError } from '../util/errors/InternalServerError';
import type { Conditions } from './Conditions';
import { matchingMediaTypes } from './conversion/ConversionUtil';
import type { RepresentationConverter, RepresentationConverterArgs } from './conversion/RepresentationConverter';
import { PassthroughStore } from './PassthroughStore';
import type { ResourceStore } from './ResourceStore';

/**
 * Store that overrides all functions that take or output a {@link Representation},
 * so `getRepresentation`, `addResource`, and `setRepresentation`.
 *
 * For incoming representations, they will be converted if an incoming converter and preferences have been set.
 * The converted Representation will be passed along.
 *
 * For outgoing representations, they will be converted if there is an outgoing converter.
 *
 * Conversions will only happen if required and will not happen if the Representation is already in the correct format.
 *
 * In the future this class should take the preferences of the request into account.
 * Even if there is a match with the output from the store,
 * if there is a low weight for that type conversions might still be preferred.
 */
export class RepresentationConvertingStore<T extends ResourceStore = ResourceStore> extends PassthroughStore<T> {
  protected readonly logger = getLoggerFor(this);

  private readonly inConverter?: RepresentationConverter;
  private readonly outConverter?: RepresentationConverter;

  private readonly inType?: string;

  /**
   * TODO: This should take RepresentationPreferences instead of a type string when supported by Components.js.
   */
  public constructor(source: T, options: {
    outConverter?: RepresentationConverter;
    inConverter?: RepresentationConverter;
    inType?: string;
  }) {
    super(source);
    this.inConverter = options.inConverter;
    this.outConverter = options.outConverter;
    this.inType = options.inType;
  }

  public async getRepresentation(identifier: ResourceIdentifier, preferences: RepresentationPreferences,
    conditions?: Conditions): Promise<Representation> {
    const representation = await super.getRepresentation(identifier, preferences, conditions);
    return this.convertRepresentation({ identifier, representation, preferences }, this.outConverter);
  }

  public async addResource(container: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<ResourceIdentifier> {
    // We can potentially run into problems here if we convert a turtle document where the base IRI is required,
    // since we don't know the resource IRI yet at this point.
    representation = await this.convertInRepresentation(container, representation);
    return this.source.addResource(container, representation, conditions);
  }

  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<void> {
    representation = await this.convertInRepresentation(identifier, representation);
    return this.source.setRepresentation(identifier, representation, conditions);
  }

  /**
   * Helper function that checks if the given representation matches the given preferences.
   */
  private matchesPreferences(representation: Representation, preferences: RepresentationPreferences): boolean {
    const { contentType } = representation.metadata;

    if (!contentType) {
      throw new InternalServerError('Content-Type is required for data conversion.');
    }

    // Check if there is a result if we try to map the preferences to the content-type
    return matchingMediaTypes(preferences, [ contentType ]).length > 0;
  }

  /**
   * Helper function that converts a Representation using the given args and converter,
   * if the conversion is necessary and there is a converter.
   */
  private async convertRepresentation(input: RepresentationConverterArgs, converter?: RepresentationConverter):
  Promise<Representation> {
    if (!converter || !input.preferences.type || this.matchesPreferences(input.representation, input.preferences)) {
      return input.representation;
    }
    this.logger.debug(`Conversion needed for ${input.identifier
      .path} from ${input.representation.metadata.contentType} to satisfy ${Object.entries(input.preferences.type)
      .map(([ value, weight ]): string => `${value};q=${weight}`).join(', ')}`);

    const converted = await converter.handleSafe(input);
    this.logger.info(`Converted representation for ${input.identifier
      .path} from ${input.representation.metadata.contentType} to ${converted.metadata.contentType}`);
    return converted;
  }

  /**
   * Helper function that converts an incoming representation if necessary.
   */
  private async convertInRepresentation(identifier: ResourceIdentifier, representation: Representation):
  Promise<Representation> {
    if (!this.inType) {
      return representation;
    }
    const preferences: RepresentationPreferences = { type: { [this.inType]: 1 }};

    return this.convertRepresentation({ identifier, representation, preferences }, this.inConverter);
  }
}
