import { AsyncHandler } from '../../util/AsyncHandler';
import { Representation } from '../../ldp/representation/Representation';
import { RepresentationPreferences } from '../../ldp/representation/RepresentationPreferences';
import { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';

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
