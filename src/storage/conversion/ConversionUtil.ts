import type { RepresentationPreference } from '../../ldp/representation/RepresentationPreference';
import type { RepresentationPreferences } from '../../ldp/representation/RepresentationPreferences';
import { getLoggerFor } from '../../logging/LogUtil';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import { matchingMediaType } from '../../util/Util';
import type { RepresentationConverterArgs } from './RepresentationConverter';

const logger = getLoggerFor('ConversionUtil');

/**
 * Filters out the media types from the preferred types that correspond to one of the supported types.
 * @param preferences - Preferences for output type.
 * @param supported - Types supported by the parser.
 *
 * @throws UnsupportedHttpError
 * If the type preferences are undefined.
 *
 * @returns The filtered list of preferences.
 */
export const matchingTypes = (preferences: RepresentationPreferences, supported: string[]):
RepresentationPreference[] => {
  if (!Array.isArray(preferences.type)) {
    logger.warn('Output type required for conversion.');
    throw new UnsupportedHttpError('Output type required for conversion.');
  }
  return preferences.type.filter(({ value, weight }): boolean => weight > 0 &&
    supported.some((type): boolean => matchingMediaType(value, type)));
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
    logger.warn('Input type required for conversion.');
    throw new UnsupportedHttpError('Input type required for conversion.');
  }
  if (!supportedIn.some((type): boolean => matchingMediaType(inType, type))) {
    logger.warn(`Can only convert from ${supportedIn} to ${supportedOut}.`);
    throw new UnsupportedHttpError(`Can only convert from ${supportedIn} to ${supportedOut}.`);
  }
  if (matchingTypes(request.preferences, supportedOut).length <= 0) {
    logger.warn(`Can only convert from ${supportedIn} to ${supportedOut}.`);
    throw new UnsupportedHttpError(`Can only convert from ${supportedIn} to ${supportedOut}.`);
  }
};
