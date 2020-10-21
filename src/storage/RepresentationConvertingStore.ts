import type { Representation } from '../ldp/representation/Representation';
import type { RepresentationPreferences } from '../ldp/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import { matchingMediaType } from '../util/Util';
import type { Conditions } from './Conditions';
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

  private readonly inConverter?: RepresentationConverter;
  private readonly outConverter?: RepresentationConverter;

  private readonly inPreferences?: RepresentationPreferences;

  public constructor(source: T, options: {
    outConverter?: RepresentationConverter;
    inConverter?: RepresentationConverter;
    inPreferences?: RepresentationPreferences;
  }) {
    super(source);
    this.inConverter = options.inConverter;
    this.outConverter = options.outConverter;
    this.inPreferences = options.inPreferences;
  }

  public async getRepresentation(identifier: ResourceIdentifier, preferences: RepresentationPreferences,
    conditions?: Conditions): Promise<Representation> {
    const representation = await super.getRepresentation(identifier, preferences, conditions);
    if (!this.outConverter || this.matchesPreferences(representation, preferences)) {
      return representation;
    }
    this.logger.info(`Convert ${identifier.path} from ${representation.metadata.contentType} to ${preferences.type}`);
    return this.outConverter.handleSafe({ identifier, representation, preferences });
  }

  public async addResource(container: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<ResourceIdentifier> {
    // We can potentially run into problems here if we convert a turtle document where the base IRI is required,
    // since we don't know the resource IRI yet at this point.
    representation = await this.convertRepresentation(container, representation);
    return this.source.addResource(container, representation, conditions);
  }

  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<void> {
    representation = await this.convertRepresentation(identifier, representation);
    return this.source.setRepresentation(identifier, representation, conditions);
  }

  private matchesPreferences(representation: Representation, preferences: RepresentationPreferences): boolean {
    if (!preferences.type) {
      return true;
    }
    const { contentType } = representation.metadata;
    return Boolean(
      contentType &&
      preferences.type.some((type): boolean =>
        type.weight > 0 &&
        matchingMediaType(type.value, contentType)),
    );
  }

  private async convertRepresentation(identifier: ResourceIdentifier, representation: Representation):
  Promise<Representation> {
    if (!this.inPreferences || !this.inConverter || this.matchesPreferences(representation, this.inPreferences)) {
      return representation;
    }
    return this.inConverter.handleSafe({ identifier, representation, preferences: this.inPreferences });
  }
}
