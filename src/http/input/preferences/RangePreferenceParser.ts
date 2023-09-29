import type { HttpRequest } from '../../../server/HttpRequest';
import { BadRequestHttpError } from '../../../util/errors/BadRequestHttpError';
import type { RepresentationPreferences } from '../../representation/RepresentationPreferences';
import { PreferenceParser } from './PreferenceParser';

/**
 * Parses the range header into range preferences.
 * If the range corresponds to a suffix-length range, it will be stored in `start` as a negative value.
 */
export class RangePreferenceParser extends PreferenceParser {
  public async handle({ request: { headers: { range }}}: { request: HttpRequest }): Promise<RepresentationPreferences> {
    if (!range) {
      return {};
    }

    const [ unit, rangeTail ] = range.split('=').map((entry): string => entry.trim());
    if (unit.length === 0) {
      throw new BadRequestHttpError(`Missing unit value from range header ${range}`);
    }
    if (!rangeTail) {
      throw new BadRequestHttpError(`Invalid range header format ${range}`);
    }

    const ranges = rangeTail.split(',').map((entry): string => entry.trim());
    const parts: { start: number; end?: number }[] = [];
    for (const rangeEntry of ranges) {
      const [ start, end ] = rangeEntry.split('-').map((entry): string => entry.trim());
      // This can actually be undefined if the split results in less than 2 elements
      if (typeof end !== 'string') {
        throw new BadRequestHttpError(`Invalid range header format ${range}`);
      }
      if (start.length === 0) {
        if (end.length === 0) {
          throw new BadRequestHttpError(`Invalid range header format ${range}`);
        }
        parts.push({ start: -Number.parseInt(end, 10) });
      } else {
        const part: typeof parts[number] = { start: Number.parseInt(start, 10) };
        if (end.length > 0) {
          part.end = Number.parseInt(end, 10);
        }
        parts.push(part);
      }
    }

    return { range: { unit, parts }};
  }
}
