import type { Representation } from '../../http/representation/Representation';
import type { RepresentationPreferences } from '../../http/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';

export interface RepresentationConverterArgs {
  /**
   * Identifier of the resource. Can be used as base IRI.
   */
  identifier: ResourceIdentifier;
  /**
   * Representation to convert.
   */
  representation: Representation;
  /**
   * Preferences indicating what is requested.
   */
  preferences: RepresentationPreferences;
}

/**
 * Converts a {@link Representation} from one media type to another, based on the given preferences.
 */
export abstract class RepresentationConverter extends AsyncHandler<RepresentationConverterArgs, Representation> {}
