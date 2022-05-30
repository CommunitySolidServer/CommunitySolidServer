import type { Representation } from '../../http/representation/Representation';
import type { RepresentationPreferences } from '../../http/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { RepresentationConverter } from '../conversion/RepresentationConverter';

/**
 * Helper class that checks if the stored {@link RepresentationConverter} and {@link RepresentationPreferences}
 * support the given input {@link RepresentationPreferences} and {@link Representation}.
 *
 * Creates a new object by combining the input arguments together with the stored preferences and checks
 * if the converter can handle that object.
 */
export class PreferenceSupport {
  private readonly preferences: RepresentationPreferences;
  private readonly converter: RepresentationConverter;

  public constructor(preferences: RepresentationPreferences, converter: RepresentationConverter) {
    this.preferences = preferences;
    this.converter = converter;
  }

  public async supports(input: { identifier: ResourceIdentifier; representation: Representation }): Promise<boolean> {
    const newInput = { ...input, preferences: this.preferences };
    try {
      await this.converter.canHandle(newInput);
      return true;
    } catch {
      return false;
    }
  }
}
