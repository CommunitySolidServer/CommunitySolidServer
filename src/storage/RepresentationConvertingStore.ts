import { Conditions } from './Conditions';
import { matchingMediaType } from '../util/Util';
import { PassthroughStore } from './PassthroughStore';
import { Representation } from '../ldp/representation/Representation';
import { RepresentationConverter } from './conversion/RepresentationConverter';
import { RepresentationPreferences } from '../ldp/representation/RepresentationPreferences';
import { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { ResourceStore } from './ResourceStore';

/**
 * Store that overrides the `getRepresentation` function.
 * Tries to convert the {@link Representation} it got from the source store
 * so it matches one of the given type preferences.
 *
 * In the future this class should take the preferences of the request into account.
 * Even if there is a match with the output from the store,
 * if there is a low weight for that type conversions might still be preferred.
 */
export class RepresentationConvertingStore extends PassthroughStore {
  private readonly converter: RepresentationConverter;

  public constructor(source: ResourceStore, converter: RepresentationConverter) {
    super(source);
    this.converter = converter;
  }

  public async getRepresentation(identifier: ResourceIdentifier, preferences: RepresentationPreferences,
    conditions?: Conditions): Promise<Representation> {
    const representation = await super.getRepresentation(identifier, preferences, conditions);
    if (this.matchesPreferences(representation, preferences)) {
      return representation;
    }
    return this.converter.handleSafe({ identifier, representation, preferences });
  }

  private matchesPreferences(representation: Representation, preferences: RepresentationPreferences): boolean {
    if (!preferences.type) {
      return true;
    }
    return Boolean(
      representation.metadata.contentType &&
      preferences.type.some((type): boolean =>
        type.weight > 0 &&
        matchingMediaType(type.value, representation.metadata.contentType!)),
    );
  }
}
