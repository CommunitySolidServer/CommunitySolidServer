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
 * Store that overrides the `getRepresentation` function.
 * Tries to convert the {@link Representation} it got from the source store
 * so it matches one of the given type preferences.
 *
 * In the future this class should take the preferences of the request into account.
 * Even if there is a match with the output from the store,
 * if there is a low weight for that type conversions might still be preferred.
 */
export class RepresentationConvertingStore<T extends ResourceStore = ResourceStore> extends PassthroughStore<T> {
  protected readonly logger = getLoggerFor(this);

  private readonly converter: RepresentationConverter;

  public constructor(source: T, converter: RepresentationConverter) {
    super(source);
    this.converter = converter;
  }

  public async getRepresentation(identifier: ResourceIdentifier, preferences: RepresentationPreferences,
    conditions?: Conditions): Promise<Representation> {
    const representation = await super.getRepresentation(identifier, preferences, conditions);
    if (this.matchesPreferences(representation, preferences)) {
      return representation;
    }
    this.logger.info(`Passing identifier '${identifier.path}' with Content-Type ${representation.metadata.contentType}
     and preferences ${preferences.type} to RepresentationConverter.`);
    return this.converter.handleSafe({ identifier, representation, preferences });
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
}
