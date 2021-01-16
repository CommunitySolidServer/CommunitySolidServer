import type { Representation } from '../ldp/representation/Representation';
import type { RepresentationPreferences } from '../ldp/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import type { Conditions } from './Conditions';
import { IfNeededConverter } from './conversion/IfNeededConverter';
import { PassthroughConverter } from './conversion/PassthroughConverter';
import type { RepresentationConverter } from './conversion/RepresentationConverter';
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

  private readonly inConverter: RepresentationConverter;
  private readonly outConverter: RepresentationConverter;
  private readonly inPreferences: RepresentationPreferences;

  /**
   * TODO: This should take RepresentationPreferences instead of a type string when supported by Components.js.
   */
  public constructor(source: T, options: {
    outConverter?: RepresentationConverter;
    inConverter?: RepresentationConverter;
    inType?: string;
  }) {
    super(source);
    const { inConverter, outConverter, inType } = options;
    this.inConverter = inConverter ? new IfNeededConverter(inConverter) : new PassthroughConverter();
    this.outConverter = outConverter ? new IfNeededConverter(outConverter) : new PassthroughConverter();
    this.inPreferences = !inType ? {} : { type: { [inType]: 1 }};
  }

  public async getRepresentation(identifier: ResourceIdentifier, preferences: RepresentationPreferences,
    conditions?: Conditions): Promise<Representation> {
    const representation = await super.getRepresentation(identifier, preferences, conditions);
    return this.outConverter.handleSafe({ identifier, representation, preferences });
  }

  public async addResource(identifier: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<ResourceIdentifier> {
    // We can potentially run into problems here if we convert a turtle document where the base IRI is required,
    // since we don't know the resource IRI yet at this point.
    representation = await this.inConverter.handleSafe({ identifier, representation, preferences: this.inPreferences });
    return this.source.addResource(identifier, representation, conditions);
  }

  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<void> {
    representation = await this.inConverter.handleSafe({ identifier, representation, preferences: this.inPreferences });
    return this.source.setRepresentation(identifier, representation, conditions);
  }
}
