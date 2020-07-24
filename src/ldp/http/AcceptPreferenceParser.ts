import { HttpRequest } from '../../server/HttpRequest';
import { PreferenceParser } from './PreferenceParser';
import { RepresentationPreference } from '../representation/RepresentationPreference';
import { RepresentationPreferences } from '../representation/RepresentationPreferences';
import {
  AcceptHeader,
  parseAccept,
  parseAcceptCharset,
  parseAcceptEncoding,
  parseAcceptLanguage,
} from '../../util/AcceptParser';

/**
 * Extracts preferences from the accept-* headers from an incoming {@link HttpRequest}.
 * Supports Accept, Accept-Charset, Accept-Encoding, Accept-Language and Accept-DateTime.
 */
export class AcceptPreferenceParser extends PreferenceParser {
  public constructor() {
    super();
  }

  public async canHandle(): Promise<void> {
    // Supports all HttpRequests
  }

  public async handle(input: HttpRequest): Promise<RepresentationPreferences> {
    const result: RepresentationPreferences = {};
    const headers: { [T in keyof RepresentationPreferences]: { val?: string; func: (input: string) => AcceptHeader[] }} = {
      type: { val: input.headers.accept, func: parseAccept },
      charset: { val: input.headers['accept-charset'] as string, func: parseAcceptCharset },
      encoding: { val: input.headers['accept-encoding'] as string, func: parseAcceptEncoding },
      language: { val: input.headers['accept-language'], func: parseAcceptLanguage },
    };
    (Object.keys(headers) as (keyof RepresentationPreferences)[]).forEach((key): void => {
      const preferences = this.parseHeader(headers[key]!.val, headers[key]!.func);
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
  private parseHeader(input: string | undefined, parseFunction: (input: string) => AcceptHeader[]): RepresentationPreference[] {
    if (!input) {
      return [];
    }
    return parseFunction(input).map((accept): RepresentationPreference => ({ value: accept.range, weight: accept.weight }));
  }
}
