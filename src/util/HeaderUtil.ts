import type { IncomingHttpHeaders } from 'node:http';
import escapeStringRegexp from 'escape-string-regexp';
import { getLoggerFor } from '../logging/LogUtil';
import type { HttpResponse } from '../server/HttpResponse';
import { BadRequestHttpError } from './errors/BadRequestHttpError';
import type {
  Accept,
  AcceptCharset,
  AcceptDatetime,
  AcceptEncoding,
  AcceptHeader,
  AcceptLanguage,
  LinkEntry,
  LinkEntryParameters,
} from './Header';
import { ContentType, QUOTED_STRING, QVALUE, SIMPLE_MEDIA_RANGE, TOKEN } from './Header';

const logger = getLoggerFor('HeaderUtil');

// BNF based on https://tools.ietf.org/html/rfc7231
//
// Accept =          #( media-range [ accept-params ] )
// Accept-Charset =  1#( ( charset / "*" ) [ weight ] )
// Accept-Encoding  = #( codings [ weight ] )
// Accept-Language = 1#( language-range [ weight ] )
//
// Content-Type = media-type

// HELPER FUNCTIONS
/**
 * Replaces all double quoted strings in the input string with `"0"`, `"1"`, etc.
 *
 * @param input - The Accept header string.
 *
 * @returns The transformed string and a map with keys `"0"`, etc. and values the original string that was there.
 *
 * @throws BadRequestHttpError
 * Thrown if invalid characters are detected in a quoted string.
 */
export function transformQuotedStrings(input: string): { result: string; replacements: Record<string, string> } {
  let idx = 0;
  const replacements: Record<string, string> = {};
  const result = input.replaceAll(/"(?:[^"\\]|\\.)*"/gu, (match): string => {
    // Not all characters allowed in quoted strings, see BNF above
    if (!QUOTED_STRING.test(match)) {
      logger.warn(`Invalid quoted string in header: ${match}`);
      throw new BadRequestHttpError(`Invalid quoted string in header: ${match}`);
    }
    const replacement = `"${idx}"`;
    replacements[replacement] = match.slice(1, -1);
    idx += 1;
    return replacement;
  });
  return { result, replacements };
}

/**
 * Splits the input string on commas, trims all parts and filters out empty ones.
 *
 * @param input - Input header string.
 *
 * @returns An array of trimmed strings.
 */
export function splitAndClean(input: string): string[] {
  return input.split(',')
    .map((part): string => part.trim())
    .filter((part): boolean => part.length > 0);
}

/**
 * Converts a qvalue to a number.
 * Returns 1 if the value is not a valid number or 1 if it is more than 1.
 * Returns 0 if the value is negative.
 * Otherwise, the parsed value is returned.
 *
 * @param qvalue - Value to convert.
 */
function parseQValue(qvalue: string): number {
  const result = Number(qvalue);
  if (Number.isNaN(result) || result >= 1) {
    return 1;
  }
  if (result < 0) {
    return 0;
  }
  return result;
}

/**
 * Logs a warning to indicate there was an invalid value.
 * Throws a {@link BadRequestHttpError} in case `strict` is `true`.
 *
 * @param message - Message to log and potentially put in the error.
 * @param strict - `true` if an error needs to be thrown.
 */
function handleInvalidValue(message: string, strict: boolean): void | never {
  logger.warn(message);
  if (strict) {
    throw new BadRequestHttpError(message);
  }
}

/**
 * Parses a list of split parameters and checks their validity. Parameters with invalid
 * syntax are ignored and not returned.
 *
 * @param parameters - A list of split parameters (token [ "=" ( token / quoted-string ) ])
 * @param replacements - The double quoted strings that need to be replaced.
 * @param strict - Determines if invalid values throw errors (`true`) or log warnings (`false`). Defaults to `false`.
 *
 * @returns An array of name/value objects corresponding to the parameters.
 */
export function parseParameters(parameters: string[], replacements: Record<string, string>, strict = false):
{ name: string; value: string }[] {
  const parsed: { name: string; value: string }[] = [];
  for (const param of parameters) {
    const [ name, rawValue ] = param.split('=').map((str): string => str.trim());

    // Test replaced string for easier check
    // parameter  = token "=" ( token / quoted-string )
    // second part is optional for certain parameters
    if (!(TOKEN.test(name) && (!rawValue || /^"\d+"$/u.test(rawValue) || TOKEN.test(rawValue)))) {
      handleInvalidValue(`Invalid parameter value: ${name}=${replacements[rawValue] || rawValue
      } does not match (token ( "=" ( token / quoted-string ))?). `, strict);
      continue;
    }

    let value = rawValue;
    if (value in replacements) {
      value = replacements[rawValue];
    }

    parsed.push({ name, value });
  }
  return parsed;
}

/**
 * Parses a single media range with corresponding parameters from an Accept header.
 * For every parameter value that is a double quoted string,
 * we check if it is a key in the replacements map.
 * If yes the value from the map gets inserted instead.
 * Invalid q values and parameter values are ignored and not returned.
 *
 * @param part - A string corresponding to a media range and its corresponding parameters.
 * @param replacements - The double quoted strings that need to be replaced.
 * @param strict - Determines if invalid values throw errors (`true`) or log warnings (`false`). Defaults to `false`.
 *
 * @returns An object corresponding to the header string, or
 * undefined if an invalid type or sub-type is detected.
 */
function parseAcceptPart(part: string, replacements: Record<string, string>, strict: boolean): Accept | undefined {
  const [ range, ...parameters ] = part.split(';').map((param): string => param.trim());

  // No reason to test differently for * since we don't check if the type exists
  if (!SIMPLE_MEDIA_RANGE.test(range)) {
    handleInvalidValue(
      `Invalid Accept range: ${range} does not match ( "*/*" / ( token "/" "*" ) / ( token "/" token ) )`,
      strict,
    );
    return;
  }

  let weight = 1;
  const mediaTypeParams: Record<string, string> = {};
  const extensionParams: Record<string, string> = {};
  let map = mediaTypeParams;
  const parsedParams = parseParameters(parameters, replacements);
  for (const { name, value } of parsedParams) {
    if (name === 'q') {
      // Extension parameters appear after the q value
      map = extensionParams;
      if (!QVALUE.test(value)) {
        handleInvalidValue(`Invalid q value for range ${range}: ${value
        } does not match ( "0" [ "." 0*3DIGIT ] ) / ( "1" [ "." 0*3("0") ] ).`, strict);
      }
      weight = parseQValue(value);
    } else {
      if (!value && map !== extensionParams) {
        handleInvalidValue(
          `Invalid Accept parameter ${name}: ` +
          `Accept parameter values are not optional when preceding the q value`,
          strict,
        );
        continue;
      }
      map[name] = value || '';
    }
  }

  return {
    range,
    weight,
    parameters: {
      mediaType: mediaTypeParams,
      extension: extensionParams,
    },
  };
}

/**
 * Parses an Accept-* header where each part is only a value and a weight, so roughly /.*(q=.*)?/ separated by commas.
 * The returned weights default to 1 if no q value is found or the q value is invalid.
 *
 * @param input - Input header string.
 * @param strict - Determines if invalid values throw errors (`true`) or log warnings (`false`). Defaults to `false`.
 *
 * @returns An array of ranges and weights.
 */
function parseNoParameters(input: string, strict = false): AcceptHeader[] {
  const parts = splitAndClean(input);

  return parts.map((part): AcceptHeader => {
    const [ range, qvalue ] = part.split(';').map((param): string => param.trim());
    const result = { range, weight: 1 };
    if (qvalue) {
      if (!qvalue.startsWith('q=')) {
        handleInvalidValue(`Only q parameters are allowed in ${input}`, strict);
        return result;
      }
      const val = qvalue.slice(2);
      if (!QVALUE.test(val)) {
        handleInvalidValue(`Invalid q value for range ${range}: ${val
        } does not match ( "0" [ "." 0*3DIGIT ] ) / ( "1" [ "." 0*3("0") ] ).`, strict);
      }
      result.weight = parseQValue(val);
    }
    return result;
  }).sort((left, right): number => right.weight - left.weight);
}

// EXPORTED FUNCTIONS

/**
 * Parses an Accept header string.
 *
 * @param input - The Accept header string.
 * @param strict - Determines if invalid values throw errors (`true`) or log warnings (`false`). Defaults to `false`.
 *
 * @returns An array of {@link Accept} objects, sorted by weight. Accept parts
 * with invalid syntax are ignored and removed from the returned array.
 */
export function parseAccept(input: string, strict = false): Accept[] {
  // Quoted strings could prevent split from having correct results
  const { result, replacements } = transformQuotedStrings(input);

  const accepts: Accept[] = [];
  for (const part of splitAndClean(result)) {
    const partOrUndef = parseAcceptPart(part, replacements, strict);

    if (partOrUndef !== undefined) {
      accepts.push(partOrUndef);
    }
  }
  return accepts.sort((left, right): number => right.weight - left.weight);
}

/**
 * Parses an Accept-Charset header string.
 *
 * @param input - The Accept-Charset header string.
 * @param strict - Determines if invalid values throw errors (`true`) or log warnings (`false`). Defaults to `false`.
 *
 * @returns An array of {@link AcceptCharset} objects, sorted by weight. Invalid ranges
 * are ignored and not returned.
 */
export function parseAcceptCharset(input: string, strict = false): AcceptCharset[] {
  const results = parseNoParameters(input);
  return results.filter((result): boolean => {
    if (!TOKEN.test(result.range)) {
      handleInvalidValue(
        `Invalid Accept-Charset range: ${result.range} does not match (content-coding / "identity" / "*")`,
        strict,
      );
      return false;
    }
    return true;
  });
}

/**
 * Parses an Accept-Encoding header string.
 *
 * @param input - The Accept-Encoding header string.
 * @param strict - Determines if invalid values throw errors (`true`) or log warnings (`false`). Defaults to `false`.
 *
 * @returns An array of {@link AcceptEncoding} objects, sorted by weight. Invalid ranges
 * are ignored and not returned.
 */
export function parseAcceptEncoding(input: string, strict = false): AcceptEncoding[] {
  const results = parseNoParameters(input);
  return results.filter((result): boolean => {
    if (!TOKEN.test(result.range)) {
      handleInvalidValue(`Invalid Accept-Encoding range: ${result.range} does not match (charset / "*")`, strict);
      return false;
    }
    return true;
  });
}

/**
 * Parses an Accept-Language header string.
 *
 * @param input - The Accept-Language header string.
 * @param strict - Determines if invalid values throw errors (`true`) or log warnings (`false`). Defaults to `false`.
 *
 * @returns An array of {@link AcceptLanguage} objects, sorted by weight. Invalid ranges
 * are ignored and not returned.
 */
export function parseAcceptLanguage(input: string, strict = false): AcceptLanguage[] {
  const results = parseNoParameters(input);
  return results.filter((result): boolean => {
    // (1*8ALPHA *("-" 1*8alphanum)) / "*"
    if (result.range !== '*' && !/^[a-zA-Z]{1,8}(?:-[a-zA-Z0-9]{1,8})*$/u.test(result.range)) {
      handleInvalidValue(
        `Invalid Accept-Language range: ${result.range} does not match ((1*8ALPHA *("-" 1*8alphanum)) / "*")`,
        strict,
      );
      return false;
    }
    return true;
  });
}

// eslint-disable-next-line max-len
const rfc1123Date = /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/u;

/**
 * Parses an Accept-DateTime header string.
 *
 * @param input - The Accept-DateTime header string.
 * @param strict - Determines if invalid values throw errors (`true`) or log warnings (`false`). Defaults to `false`.
 *
 * @returns An array with a single {@link AcceptDatetime} object,
 * or an empty array if a range in an invalid format is detected.
 */
export function parseAcceptDateTime(input: string, strict = false): AcceptDatetime[] {
  const range = input.trim();
  if (!range) {
    return [];
  }
  if (!rfc1123Date.test(range)) {
    handleInvalidValue(`Invalid Accept-DateTime range: ${range} does not match the RFC1123 format`, strict);
    return [];
  }
  return [{ range, weight: 1 }];
}

/**
 * Adds a header value without overriding previous values.
 */
export function addHeader(response: HttpResponse, name: string, value: string | string[]): void {
  let allValues: string[] = [];
  if (response.hasHeader(name)) {
    let oldValues = response.getHeader(name)!;
    if (typeof oldValues === 'string') {
      oldValues = [ oldValues ];
    } else if (typeof oldValues === 'number') {
      oldValues = [ `${oldValues}` ];
    }
    allValues = oldValues;
  }
  if (Array.isArray(value)) {
    allValues.push(...value);
  } else {
    allValues.push(value);
  }
  response.setHeader(name, allValues.length === 1 ? allValues[0] : allValues);
}

/**
 * Parses the Content-Type header and also parses any parameters in the header.
 *
 * @param input - The Content-Type header string.
 *
 * @returns A {@link ContentType} object containing the value and optional parameters.
 *
 * @throws BadRequestHttpError
 * Thrown on invalid header syntax.
 */
export function parseContentType(input: string): ContentType {
  // Quoted strings could prevent split from having correct results
  const { result, replacements } = transformQuotedStrings(input);
  const [ value, ...params ] = result.split(';').map((str): string => str.trim());
  if (!SIMPLE_MEDIA_RANGE.test(value)) {
    logger.warn(`Invalid content-type: ${value}`);
    throw new BadRequestHttpError(`Invalid content-type: ${value} does not match ( token "/" token )`);
  }

  const contentType = new ContentType(value);
  for (const param of parseParameters(params, replacements)) {
    contentType.parameters[param.name] = param.value;
  }
  return contentType;
}

/**
 * The Forwarded header from RFC7239
 */
export interface Forwarded {
  /** The user-agent facing interface of the proxy */
  by?: string;
  /** The node making the request to the proxy */
  for?: string;
  /** The host request header field as received by the proxy */
  host?: string;
  /** The protocol used to make the request */
  proto?: string;
}

/**
 * Parses a Forwarded header value and will fall back to X-Forwarded-* headers.
 *
 * @param headers - The incoming HTTP headers.
 *
 * @returns The parsed Forwarded header.
 */
export function parseForwarded(headers: IncomingHttpHeaders): Forwarded {
  const forwarded: Record<string, string> = {};
  if (headers.forwarded) {
    for (const pair of headers.forwarded.replace(/\s*,.*/u, '').split(';')) {
      const components = /^(by|for|host|proto)=(.+)$/u.exec(pair);
      if (components) {
        forwarded[components[1]] = components[2];
      }
    }
  } else {
    const suffixes = [ 'host', 'proto' ];
    for (const suffix of suffixes) {
      const value = headers[`x-forwarded-${suffix}`] as string;
      if (value) {
        forwarded[suffix] = value.trim().replace(/\s*,.*/u, '');
      }
    }
  }
  return forwarded;
}

/**
 * Parses the link header(s) and returns an array of LinkEntry objects.
 *
 * @param link - A single link header or an array of link headers
 *
 * @returns A LinkEntry array, LinkEntry contains a link and a params Record&lt;string,string&gt;
 */
export function parseLinkHeader(link: string | string[] = []): LinkEntry[] {
  const linkHeaders = Array.isArray(link) ? link : [ link ];
  const links: LinkEntry[] = [];
  for (const entry of linkHeaders) {
    const { result, replacements } = transformQuotedStrings(entry);
    for (const part of splitAndClean(result)) {
      const [ target, ...parameters ] = part.split(/\s*;\s*/u);
      if (/^[^<]|[^>]$/u.test(target)) {
        logger.warn(`Invalid link header ${part}.`);
        continue;
      }

      // RFC 8288 - Web Linking (https://datatracker.ietf.org/doc/html/rfc8288)
      //
      //     The rel parameter MUST be
      //     present but MUST NOT appear more than once in a given link-value;
      //     occurrences after the first MUST be ignored by parsers.
      //
      const params: Record<string, string> = {};
      for (const { name, value } of parseParameters(parameters, replacements)) {
        if (name === 'rel' && 'rel' in params) {
          continue;
        }
        params[name] = value;
      }

      if (!('rel' in params)) {
        logger.warn(`Invalid link header ${part} contains no 'rel' parameter.`);
        continue;
      }

      links.push({ target: target.slice(1, -1), parameters: params as LinkEntryParameters });
    }
  }
  return links;
}

// Map used as a simple cache in the helper function matchesAuthorizationScheme.
const authSchemeRegexCache: Map<string, RegExp> = new Map();
/**
 * Checks if the value of an HTTP Authorization header matches a specific scheme (e.g. Basic, Bearer, etc).
 *
 * @param scheme - Name of the authorization scheme (case insensitive).
 * @param authorization - The value of the Authorization header (may be undefined).
 *
 * @returns True if the Authorization header uses the specified scheme, false otherwise.
 */
export function matchesAuthorizationScheme(scheme: string, authorization?: string): boolean {
  const lowerCaseScheme = scheme.toLowerCase();
  if (!authSchemeRegexCache.has(lowerCaseScheme)) {
    authSchemeRegexCache.set(lowerCaseScheme, new RegExp(`^${escapeStringRegexp(lowerCaseScheme)} `, 'iu'));
  }
  // Support authorization being undefined (for the sake of usability).
  return typeof authorization !== 'undefined' && authSchemeRegexCache.get(lowerCaseScheme)!.test(authorization);
}

/**
 * Checks if the scheme part of the specified url matches at least one of the provided options.
 *
 * @param url - A string representing the URL.
 * @param schemes - Scheme value options (the function will check whether at least one matches the URL scheme).
 *
 * @returns True if the URL scheme matches at least one of the provided options, false otherwise.
 */
export function hasScheme(url: string, ...schemes: string[]): boolean {
  const schemeOptions = new Set(schemes.map((item): string => item.toLowerCase()));
  const urlSchemeResult = /^(.+?):\/\//u.exec(url);
  return urlSchemeResult ? schemeOptions.has(urlSchemeResult[1].toLowerCase()) : false;
}
