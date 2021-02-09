import type { ValuePreferences } from '../../ldp/representation/RepresentationPreferences';
import { INTERNAL_ALL } from '../../util/ContentTypes';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';

/**
 * Filters media types based on the given preferences.
 * Based on RFC 7231 - Content negotiation.
 * Will add a default `internal/*;q=0` to the preferences to prevent accidental use of internal types.
 * Since more specific media ranges override less specific ones,
 * this will be ignored if there is a specific internal type preference.
 *
 * This should be called even if there are no preferredTypes since this also filters out internal types.
 *
 * @param preferredTypes - Preferences for output type.
 * @param availableTypes - Media types to compare to the preferences.
 *
 * @throws BadRequestHttpError
 * If the type preferences are undefined or if there are duplicate preferences.
 *
 * @returns The weighted and filtered list of matching types.
 */
export function matchingMediaTypes(preferredTypes: ValuePreferences = {}, availableTypes: ValuePreferences = {}):
string[] {
  // No preference means anything is acceptable
  const preferred = { ...preferredTypes };
  if (Object.keys(preferredTypes).length === 0) {
    preferred['*/*'] = 1;
  }
  // Prevent accidental use of internal types
  if (!(INTERNAL_ALL in preferred)) {
    preferred[INTERNAL_ALL] = 0;
  }

  // RFC 7231
  //    Media ranges can be overridden by more specific media ranges or
  //    specific media types.  If more than one media range applies to a
  //    given type, the most specific reference has precedence.
  const weightedSupported = Object.entries(availableTypes).map(([ type, quality ]): [string, number] => {
    const match = /^([^/]+)\/([^\s;]+)/u.exec(type);
    if (!match) {
      throw new InternalServerError(`Unexpected type preference: ${type}`);
    }
    const [ , main, sub ] = match;
    const weight =
      preferred[type] ??
      preferred[`${main}/${sub}`] ??
      preferred[`${main}/*`] ??
      preferred['*/*'] ??
      0;
    return [ type, weight * quality ];
  });

  // Return all non-zero preferences in descending order of weight
  return weightedSupported
    .filter(([ , weight ]): boolean => weight !== 0)
    .sort(([ , weightA ], [ , weightB ]): number => weightB - weightA)
    .map(([ type ]): string => type);
}

/**
 * Determines whether any available type satisfies the preferences.
 *
 * @param preferredTypes - Preferences for output type.
 * @param availableTypes - Media types to compare to the preferences.
 *
 * @throws BadRequestHttpError
 * If the type preferences are undefined or if there are duplicate preferences.
 *
 * @returns Whether there is at least one preference match.
 */
export function hasMatchingMediaTypes(preferredTypes?: ValuePreferences, availableTypes?: ValuePreferences): boolean {
  return matchingMediaTypes(preferredTypes, availableTypes).length !== 0;
}

/**
 * Checks if the given two media types/ranges match each other.
 * Takes wildcards into account.
 * @param mediaA - Media type to match.
 * @param mediaB - Media type to match.
 *
 * @returns True if the media type patterns can match each other.
 */
export function matchesMediaType(mediaA: string, mediaB: string): boolean {
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
}

/**
 * Determines whether the given conversion request is supported,
 * given the available content type conversions:
 *  - Checks if there is a content type for the input.
 *  - Checks if the input type is supported by the parser.
 *  - Checks if the parser can produce one of the preferred output types.
 * Throws an error with details if conversion is not possible.
 * @param inputType - Actual input type.
 * @param outputTypes - Acceptable output types.
 * @param convertorIn - Media types that can be parsed by the converter.
 * @param convertorOut - Media types that can be produced by the converter.
 */
export function supportsMediaTypeConversion(
  inputType = 'unknown', outputTypes: ValuePreferences = {},
  convertorIn: ValuePreferences = {}, convertorOut: ValuePreferences = {},
): void {
  if (!Object.keys(convertorIn).some((type): boolean => matchesMediaType(inputType, type)) ||
     matchingMediaTypes(outputTypes, convertorOut).length === 0) {
    throw new NotImplementedHttpError(
      `Cannot convert from ${inputType} to ${Object.keys(outputTypes)
      }, only from ${Object.keys(convertorIn)} to ${Object.keys(convertorOut)}.`,
    );
  }
}
