import type { RepresentationPreference } from '../../ldp/representation/RepresentationPreference';
import type { RepresentationPreferences } from '../../ldp/representation/RepresentationPreferences';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import { matchingMediaType } from '../../util/Util';
import type { RepresentationConverterArgs } from './RepresentationConverter';

/**
 * Filters media types based on the given preferences.
 * Based on RFC 7231 - Content negotiation.
 *
 * @param preferences - Preferences for output type.
 * @param types - Media types to compare to the preferences.
 *
 * @throws UnsupportedHttpError
 * If the type preferences are undefined or if there are duplicate preferences.
 *
 * @returns The weighted and filtered list of matching types.
 */
export const matchingTypes = (preferences: RepresentationPreferences, types: string[]):
RepresentationPreference[] => {
  if (!Array.isArray(preferences.type)) {
    throw new UnsupportedHttpError('Output type required for conversion.');
  }

  const prefMap = preferences.type.reduce((map: Record<string, number>, pref): Record<string, number> => {
    if (map[pref.value]) {
      throw new UnsupportedHttpError(`Duplicate type preference found: ${pref.value}`);
    }
    map[pref.value] = pref.weight;
    return map;
  }, {});

  // RFC 7231
  //    Media ranges can be overridden by more specific media ranges or
  //    specific media types.  If more than one media range applies to a
  //    given type, the most specific reference has precedence.
  const weightedSupported = types.map((type): RepresentationPreference => {
    const match = /^([^/]+)\/([^\s;]+)/u.exec(type);
    if (!match) {
      throw new InternalServerError(`Unexpected type preference: ${type}`);
    }
    const [ , main, sub ] = match;
    const weight = prefMap[type] ?? prefMap[`${main}/${sub}`] ?? prefMap[`${main}/*`] ?? prefMap['*/*'] ?? 0;
    return { value: type, weight };
  });

  return weightedSupported.filter((preference): boolean => preference.weight !== 0);
};

/**
 * Runs some standard checks on the input request:
 *  - Checks if there is a content type for the input.
 *  - Checks if the input type is supported by the parser.
 *  - Checks if the parser can produce one of the preferred output types.
 * @param request - Incoming arguments.
 * @param supportedIn - Media types that can be parsed by the converter.
 * @param supportedOut - Media types that can be produced by the converter.
 */
export const checkRequest = (request: RepresentationConverterArgs, supportedIn: string[], supportedOut: string[]):
void => {
  const inType = request.representation.metadata.contentType;
  if (!inType) {
    throw new UnsupportedHttpError('Input type required for conversion.');
  }
  if (!supportedIn.some((type): boolean => matchingMediaType(inType, type))) {
    throw new UnsupportedHttpError(`Can only convert from ${supportedIn} to ${supportedOut}.`);
  }
  if (matchingTypes(request.preferences, supportedOut).length <= 0) {
    throw new UnsupportedHttpError(`Can only convert from ${supportedIn} to ${supportedOut}.`);
  }
};
