import type { HttpRequest } from '../../server/HttpRequest';
import {
  parseAccept,
  parseAcceptCharset,
  parseAcceptEncoding,
  parseAcceptLanguage,
  parseAcceptDateTime,
} from '../../util/HeaderUtil';
import type { RepresentationPreferences, ValuePreferences } from '../representation/RepresentationPreferences';
import { PreferenceParser } from './PreferenceParser';

const parsers: {
  name: keyof RepresentationPreferences;
  header: string;
  parse: (value: string) => ValuePreferences;
}[] = [
  { name: 'type', header: 'accept', parse: parseAccept },
  { name: 'charset', header: 'accept-charset', parse: parseAcceptCharset },
  { name: 'encoding', header: 'accept-encoding', parse: parseAcceptEncoding },
  { name: 'language', header: 'accept-language', parse: parseAcceptLanguage },
  { name: 'datetime', header: 'accept-datetime', parse: parseAcceptDateTime },
];

/**
 * Extracts preferences from the Accept-* headers from an incoming {@link HttpRequest}.
 * Supports Accept, Accept-Charset, Accept-Encoding, Accept-Language and Accept-DateTime.
 */
export class AcceptPreferenceParser extends PreferenceParser {
  public async handle({ request: { headers }}: { request: HttpRequest }): Promise<RepresentationPreferences> {
    const preferences: RepresentationPreferences = {};
    for (const { name, header, parse } of parsers) {
      const value = headers[header];
      if (typeof value === 'string') {
        const result: ValuePreferences = parse(value);
        // Interpret empty headers (or headers with no valid values) the same as missing headers
        if (Object.keys(result).length > 0) {
          preferences[name] = result;
        }
      }
    }
    return preferences;
  }
}
