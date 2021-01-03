import type { RepresentationPreference } from '../../ldp/representation/RepresentationPreference';
import type { RepresentationPreferences } from '../../ldp/representation/RepresentationPreferences';
import { INTERNAL_ALL } from '../../util/ContentTypes';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { RepresentationConverterArgs } from './RepresentationConverter';

/**
 * Filters media types based on the given preferences.
 * Based on RFC 7231 - Content negotiation.
 * Will add a default `internal/*;q=0` to the preferences to prevent accidental use of internal types.
 * Since more specific media ranges override less specific ones,
 * this will be ignored if there is a specific internal type preference.
 *
 * @param preferences - Preferences for output type.
 * @param types - Media types to compare to the preferences.
 *
 * @throws BadRequestHttpError
 * If the type preferences are undefined or if there are duplicate preferences.
 *
 * @returns The weighted and filtered list of matching types.
 */
export const matchingMediaTypes = (preferences: RepresentationPreferences, types: string[]):
RepresentationPreference[] => {
  if (!Array.isArray(preferences.type)) {
    throw new BadRequestHttpError('Output type required for conversion.');
  }

  const prefMap = preferences.type.reduce((map: Record<string, number>, pref): Record<string, number> => {
    if (map[pref.value]) {
      throw new BadRequestHttpError(`Duplicate type preference found: ${pref.value}`);
    }
    map[pref.value] = pref.weight;
    return map;
  }, {});

  // Prevent accidental use of internal types
  if (!prefMap[INTERNAL_ALL]) {
    prefMap[INTERNAL_ALL] = 0;
  }

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

  // Return all non-zero preferences in descending order of weight
  return weightedSupported
    .filter((pref): boolean => pref.weight !== 0)
    .sort((prefA, prefB): number => prefB.weight - prefA.weight);
};

/**
 * Checks if the given two media types/ranges match each other.
 * Takes wildcards into account.
 * @param mediaA - Media type to match.
 * @param mediaB - Media type to match.
 *
 * @returns True if the media type patterns can match each other.
 */
export const matchesMediaType = (mediaA: string, mediaB: string): boolean => {
  if (mediaA === mediaB) {
    return true;
  }

  const [ typeA, subTypeA ] = mediaA.split('/');
  const [ typeB, subTypeB ] = mediaB.split('/');
  if (typeA === '*' || typeB === '*') {
    return true;
  }
  if (typeA !== typeB) {
    return false;
  }
  if (subTypeA === '*' || subTypeB === '*') {
    return true;
  }
  return subTypeA === subTypeB;
};

/**
 * Determines whether the given conversion request is supported,
 * given the available content type conversions:
 *  - Checks if there is a content type for the input.
 *  - Checks if the input type is supported by the parser.
 *  - Checks if the parser can produce one of the preferred output types.
 * Throws an error with details if conversion is not possible.
 * @param request - Incoming arguments.
 * @param supportedIn - Media types that can be parsed by the converter.
 * @param supportedOut - Media types that can be produced by the converter.
 */
export const supportsConversion = (request: RepresentationConverterArgs, supportedIn: string[],
  supportedOut: string[]): void => {
  const inType = request.representation.metadata.contentType;
  if (!inType) {
    throw new BadRequestHttpError('Input type required for conversion.');
  }
  if (!supportedIn.some((type): boolean => matchesMediaType(inType, type))) {
    throw new NotImplementedHttpError(`Can only convert from ${supportedIn} to ${supportedOut}.`);
  }
  if (matchingMediaTypes(request.preferences, supportedOut).length <= 0) {
    throw new NotImplementedHttpError(`Can only convert from ${supportedIn} to ${supportedOut}.`);
  }
};
