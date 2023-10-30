import { InternalServerError } from '../../../util/errors/InternalServerError';
import { UnionHandler } from '../../../util/handlers/UnionHandler';
import type { RepresentationPreferences } from '../../representation/RepresentationPreferences';
import type { PreferenceParser } from './PreferenceParser';

/**
 * Combines the results of multiple {@link PreferenceParser}s.
 * Will throw an error if multiple parsers return a range as these can't logically be combined.
 */
export class UnionPreferenceParser extends UnionHandler<PreferenceParser> {
  public constructor(parsers: PreferenceParser[]) {
    super(parsers, false, false);
  }

  protected async combine(results: RepresentationPreferences[]): Promise<RepresentationPreferences> {
    const rangeCount = results.filter((result): boolean => Boolean(result.range)).length;
    if (rangeCount > 1) {
      throw new InternalServerError('Found multiple range values. This implies a misconfiguration.');
    }

    const preferences: RepresentationPreferences = {};
    for (const result of results) {
      for (const key of Object.keys(result) as (keyof RepresentationPreferences)[]) {
        if (key === 'range') {
          preferences[key] = result[key];
        } else {
          preferences[key] = { ...preferences[key], ...result[key] };
        }
      }
    }
    return preferences;
  }
}
