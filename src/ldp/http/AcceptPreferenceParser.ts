import type { HttpRequest } from '../../server/HttpRequest';
import type { AcceptHeader } from '../../util/HeaderUtil';
import {
  parseAccept,
  parseAcceptCharset,
  parseAcceptEncoding,
  parseAcceptLanguage,
} from '../../util/HeaderUtil';
import type { RepresentationPreference } from '../representation/RepresentationPreference';
import type { RepresentationPreferences } from '../representation/RepresentationPreferences';
import { PreferenceParser } from './PreferenceParser';

/**
 * Extracts preferences from the accept-* headers from an incoming {@link HttpRequest}.
 * Supports Accept, Accept-Charset, Accept-Encoding, Accept-Language and Accept-DateTime.
 */
export class AcceptPreferenceParser extends PreferenceParser {
  public constructor() {
    super();
  }

  public async handle(input: HttpRequest): Promise<RepresentationPreferences> {
    const result: RepresentationPreferences = {};
    const headers:
    { [T in keyof RepresentationPreferences]: { val?: string; func: (inp: string) => AcceptHeader[] }} = {
      type: { val: input.headers.accept, func: parseAccept },
      charset: { val: input.headers['accept-charset'] as string, func: parseAcceptCharset },
      encoding: { val: input.headers['accept-encoding'] as string, func: parseAcceptEncoding },
      language: { val: input.headers['accept-language'], func: parseAcceptLanguage },
    };
    (Object.keys(headers) as (keyof RepresentationPreferences)[]).forEach((key): void => {
      const preferences = this.parseHeader(headers[key]!.func, headers[key]!.val);
      if (preferences.length > 0) {
        result[key] = preferences;
      }
    });

    // Accept-DateTime is currently specified to simply have a datetime as value
    if (input.headers['accept-datetime']) {
      result.datetime = [{ value: input.headers['accept-datetime'] as string, weight: 1 }];
    }

    return result;
  }

  /**
   * Converts a header string using the given parse function to {@link RepresentationPreference}[].
   * @param input - Input header string.
   * @param parseFunction - Function that converts header string to {@link AcceptHeader}.
   *
   * @returns A list of {@link RepresentationPreference}. Returns an empty list if input was not defined.
   */
  private parseHeader(parseFunction: (input: string) => AcceptHeader[], input?: string): RepresentationPreference[] {
    if (!input) {
      return [];
    }
    return parseFunction(input).map((accept): RepresentationPreference =>
      ({ value: accept.range, weight: accept.weight }));
  }
}
