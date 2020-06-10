import { RepresentationPreference } from './RepresentationPreference';

/**
 * Contains the preferences of which kind of representation is requested.
 */
export interface RepresentationPreferences {
  type?: RepresentationPreference[];
  charset?: RepresentationPreference[];
  datetime?: RepresentationPreference[];
  encoding?: RepresentationPreference[];
  language?: RepresentationPreference[];
}
