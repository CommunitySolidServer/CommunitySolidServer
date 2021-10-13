import type { IncomingHttpHeaders } from 'http';
import { getLoggerFor } from '../logging/LogUtil';
import type { HttpResponse } from '../server/HttpResponse';
import { BadRequestHttpError } from './errors/BadRequestHttpError';

const logger = getLoggerFor('HeaderUtil');

// BNF based on https://tools.ietf.org/html/rfc7231
//
// Accept =          #( media-range [ accept-params ] )
// Accept-Charset =  1#( ( charset / "*" ) [ weight ] )
// Accept-Encoding  = #( codings [ weight ] )
// Accept-Language = 1#( language-range [ weight ] )
//
// Content-Type = media-type
// media-type = type "/" subtype *( OWS ";" OWS parameter )
//
// media-range    = ( "*/*"
//                / ( type "/" "*" )
//                / ( type "/" subtype )
//                ) *( OWS ";" OWS parameter ) ; media type parameters
// accept-params  = weight *( accept-ext )
// accept-ext     = OWS ";" OWS token [ "=" ( token / quoted-string ) ] ; extension parameters
//
// weight = OWS ";" OWS "q=" qvalue
// qvalue = ( "0" [ "." 0*3DIGIT ] )
//        / ( "1" [ "." 0*3("0") ] )
//
// type       = token
// subtype    = token
// parameter  = token "=" ( token / quoted-string )
//
// quoted-string  = DQUOTE *( qdtext / quoted-pair ) DQUOTE
// qdtext         = HTAB / SP / %x21 / %x23-5B / %x5D-7E / obs-text
// obs-text       = %x80-FF
// quoted-pair    = "\" ( HTAB / SP / VCHAR / obs-text )
//
// charset = token
//
// codings          = content-coding / "identity" / "*"
// content-coding   = token
//
// language-range   = (1*8ALPHA *("-" 1*8alphanum)) / "*"
// alphanum         = ALPHA / DIGIT
//
// Delimiters are chosen from the set of US-ASCII visual characters
// not allowed in a token (DQUOTE and "(),/:;<=>?@[\]{}").
// token          = 1*tchar
// tchar          = "!" / "#" / "$" / "%" / "&" / "'" / "*"
//                / "+" / "-" / "." / "^" / "_" / "`" / "|" / "~"
//                / DIGIT / ALPHA
//                ; any VCHAR, except delimiters
//

// INTERFACES
/**
 * General interface for all Accept* headers.
 */
export interface AcceptHeader {
  /** Requested range. Can be a specific value or `*`, matching all. */
  range: string;
  /** Weight of the preference [0, 1]. */
  weight: number;
}

/**
 * Contents of an HTTP Accept header.
 * Range is type/subtype. Both can be `*`.
 */
export interface Accept extends AcceptHeader {
  parameters: {
    /** Media type parameters. These are the parameters that came before the q value. */
    mediaType: Record<string, string>;
    /**
     * Extension parameters. These are the parameters that came after the q value.
     * Value will be an empty string if there was none.
     */
    extension: Record<string, string>;
  };
}

/**
 * Contents of an HTTP Accept-Charset header.
 */
export interface AcceptCharset extends AcceptHeader { }

/**
 * Contents of an HTTP Accept-Encoding header.
 */
export interface AcceptEncoding extends AcceptHeader { }

/**
 * Contents of an HTTP Accept-Language header.
 */
export interface AcceptLanguage extends AcceptHeader { }

/**
 * Contents of an HTTP Accept-Datetime header.
 */
export interface AcceptDatetime extends AcceptHeader { }

// REUSED REGEXES
const token = /^[a-zA-Z0-9!#$%&'*+-.^_`|~]+$/u;

// HELPER FUNCTIONS
/**
 * Replaces all double quoted strings in the input string with `"0"`, `"1"`, etc.
 * @param input - The Accept header string.
 *
 * @returns The transformed string and a map with keys `"0"`, etc. and values the original string that was there.
 */
export function transformQuotedStrings(input: string): { result: string; replacements: Record<string, string> } {
  let idx = 0;
  const replacements: Record<string, string> = {};
  const result = input.replace(/"(?:[^"\\]|\\.)*"/gu, (match): string => {
    // Not all characters allowed in quoted strings, see BNF above
    if (!/^"(?:[\t !\u0023-\u005B\u005D-\u007E\u0080-\u00FF]|(?:\\[\t\u0020-\u007E\u0080-\u00FF]))*"$/u.test(match)) {
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
 */
export function splitAndClean(input: string): string[] {
  return input.split(',')
    .map((part): string => part.trim())
    .filter((part): boolean => part.length > 0);
}

/**
 * Checks if the input string matches the qvalue regex.
 *
 * @param qvalue - Input qvalue string (so "q=....").
 *
 * @throws {@link BadRequestHttpError}
 * Thrown on invalid syntax.
 */
function testQValue(qvalue: string): void {
  if (!/^(?:(?:0(?:\.\d{0,3})?)|(?:1(?:\.0{0,3})?))$/u.test(qvalue)) {
    logger.warn(`Invalid q value: ${qvalue}`);
    throw new BadRequestHttpError(
      `Invalid q value: ${qvalue} does not match ( "0" [ "." 0*3DIGIT ] ) / ( "1" [ "." 0*3("0") ] ).`,
    );
  }
}

/**
 * Parses a list of split parameters and checks their validity.
 *
 * @param parameters - A list of split parameters (token [ "=" ( token / quoted-string ) ])
 * @param replacements - The double quoted strings that need to be replaced.
 *
 *
 * @throws {@link BadRequestHttpError}
 * Thrown on invalid parameter syntax.
 *
 * @returns An array of name/value objects corresponding to the parameters.
 */
export function parseParameters(parameters: string[], replacements: Record<string, string>):
{ name: string; value: string }[] {
  return parameters.map((param): { name: string; value: string } => {
    const [ name, rawValue ] = param.split('=').map((str): string => str.trim());

    // Test replaced string for easier check
    // parameter  = token "=" ( token / quoted-string )
    // second part is optional for certain parameters
    if (!(token.test(name) && (!rawValue || /^"\d+"$/u.test(rawValue) || token.test(rawValue)))) {
      logger.warn(`Invalid parameter value: ${name}=${replacements[rawValue] || rawValue}`);
      throw new BadRequestHttpError(
        `Invalid parameter value: ${name}=${replacements[rawValue] || rawValue} ` +
        `does not match (token ( "=" ( token / quoted-string ))?). `,
      );
    }

    let value = rawValue;
    if (value in replacements) {
      value = replacements[rawValue];
    }

    return { name, value };
  });
}

/**
 * Parses a single media range with corresponding parameters from an Accept header.
 * For every parameter value that is a double quoted string,
 * we check if it is a key in the replacements map.
 * If yes the value from the map gets inserted instead.
 *
 * @param part - A string corresponding to a media range and its corresponding parameters.
 * @param replacements - The double quoted strings that need to be replaced.
 *
 * @throws {@link BadRequestHttpError}
 * Thrown on invalid type, qvalue or parameter syntax.
 *
 * @returns {@link Accept} object corresponding to the header string.
 */
function parseAcceptPart(part: string, replacements: Record<string, string>): Accept {
  const [ range, ...parameters ] = part.split(';').map((param): string => param.trim());

  // No reason to test differently for * since we don't check if the type exists
  const [ type, subtype ] = range.split('/');
  if (!type || !subtype || !token.test(type) || !token.test(subtype)) {
    logger.warn(`Invalid Accept range: ${range}`);
    throw new BadRequestHttpError(
      `Invalid Accept range: ${range} does not match ( "*/*" / ( token "/" "*" ) / ( token "/" token ) )`,
    );
  }

  let weight = 1;
  const mediaTypeParams: Record<string, string> = {};
  const extensionParams: Record<string, string> = {};
  let map = mediaTypeParams;
  const parsedParams = parseParameters(parameters, replacements);
  parsedParams.forEach(({ name, value }): void => {
    if (name === 'q') {
      // Extension parameters appear after the q value
      map = extensionParams;
      testQValue(value);
      weight = Number.parseFloat(value);
    } else {
      if (!value && map !== extensionParams) {
        logger.warn(`Invalid Accept parameter ${name}`);
        throw new BadRequestHttpError(`Invalid Accept parameter ${name}: ` +
        `Accept parameter values are not optional when preceding the q value`);
      }
      map[name] = value || '';
    }
  });

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
 * @param input - Input header string.
 *
 * @throws {@link BadRequestHttpError}
 * Thrown on invalid qvalue syntax.
 *
 * @returns An array of ranges and weights.
 */
function parseNoParameters(input: string): AcceptHeader[] {
  const parts = splitAndClean(input);

  return parts.map((part): AcceptHeader => {
    const [ range, qvalue ] = part.split(';').map((param): string => param.trim());
    const result = { range, weight: 1 };
    if (qvalue) {
      if (!qvalue.startsWith('q=')) {
        logger.warn(`Only q parameters are allowed in ${input}`);
        throw new BadRequestHttpError(`Only q parameters are allowed in ${input}`);
      }
      const val = qvalue.slice(2);
      testQValue(val);
      result.weight = Number.parseFloat(val);
    }
    return result;
  }).sort((left, right): number => right.weight - left.weight);
}

// EXPORTED FUNCTIONS

/**
 * Parses an Accept header string.
 *
 * @param input - The Accept header string.
 *
 * @throws {@link BadRequestHttpError}
 * Thrown on invalid header syntax.
 *
 * @returns An array of {@link Accept} objects, sorted by weight.
 */
export function parseAccept(input: string): Accept[] {
  // Quoted strings could prevent split from having correct results
  const { result, replacements } = transformQuotedStrings(input);
  return splitAndClean(result)
    .map((part): Accept => parseAcceptPart(part, replacements))
    .sort((left, right): number => right.weight - left.weight);
}

/**
 * Parses an Accept-Charset header string.
 *
 * @param input - The Accept-Charset header string.
 *
 * @throws {@link BadRequestHttpError}
 * Thrown on invalid header syntax.
 *
 * @returns An array of {@link AcceptCharset} objects, sorted by weight.
 */
export function parseAcceptCharset(input: string): AcceptCharset[] {
  const results = parseNoParameters(input);
  results.forEach((result): void => {
    if (!token.test(result.range)) {
      logger.warn(`Invalid Accept-Charset range: ${result.range}`);
      throw new BadRequestHttpError(
        `Invalid Accept-Charset range: ${result.range} does not match (content-coding / "identity" / "*")`,
      );
    }
  });
  return results;
}

/**
 * Parses an Accept-Encoding header string.
 *
 * @param input - The Accept-Encoding header string.
 *
 * @throws {@link BadRequestHttpError}
 * Thrown on invalid header syntax.
 *
 * @returns An array of {@link AcceptEncoding} objects, sorted by weight.
 */
export function parseAcceptEncoding(input: string): AcceptEncoding[] {
  const results = parseNoParameters(input);
  results.forEach((result): void => {
    if (!token.test(result.range)) {
      logger.warn(`Invalid Accept-Encoding range: ${result.range}`);
      throw new BadRequestHttpError(`Invalid Accept-Encoding range: ${result.range} does not match (charset / "*")`);
    }
  });
  return results;
}

/**
 * Parses an Accept-Language header string.
 *
 * @param input - The Accept-Language header string.
 *
 * @throws {@link BadRequestHttpError}
 * Thrown on invalid header syntax.
 *
 * @returns An array of {@link AcceptLanguage} objects, sorted by weight.
 */
export function parseAcceptLanguage(input: string): AcceptLanguage[] {
  const results = parseNoParameters(input);
  results.forEach((result): void => {
    // (1*8ALPHA *("-" 1*8alphanum)) / "*"
    if (result.range !== '*' && !/^[a-zA-Z]{1,8}(?:-[a-zA-Z0-9]{1,8})*$/u.test(result.range)) {
      logger.warn(
        `Invalid Accept-Language range: ${result.range}`,
      );
      throw new BadRequestHttpError(
        `Invalid Accept-Language range: ${result.range} does not match ((1*8ALPHA *("-" 1*8alphanum)) / "*")`,
      );
    }
  });
  return results;
}

// eslint-disable-next-line max-len
const rfc1123Date = /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/u;

/**
 * Parses an Accept-DateTime header string.
 *
 * @param input - The Accept-DateTime header string.
 *
 * @returns An array with a single {@link AcceptDatetime} object.
 */
export function parseAcceptDateTime(input: string): AcceptDatetime[] {
  const results: AcceptDatetime[] = [];
  const range = input.trim();
  if (range) {
    if (!rfc1123Date.test(range)) {
      logger.warn(
        `Invalid Accept-DateTime range: ${range}`,
      );
      throw new BadRequestHttpError(
        `Invalid Accept-DateTime range: ${range} does not match the RFC1123 format`,
      );
    }
    results.push({ range, weight: 1 });
  }
  return results;
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
 * Extracts only the first parameter of the content-type header
 *
 * @param contentType - The media type of the content-type header
 *
 * @returns The parsed media type of the content-type
 */
export function parseContentType(contentType: string): string {
  return /^\s*[^;\s]*/u.exec(contentType)![0];
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
