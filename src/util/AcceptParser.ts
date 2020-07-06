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
// Delimiters are chosen from the set of US-ASCII visual characters not allowed in a token (DQUOTE and "(),/:;<=>?@[\]{}").
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
    mediaType: { [key: string]: string };
    /** Extension parameters. These are the parameters that came after the q value. Value will be an empty string if there was none. */
    extension: { [key: string]: string };
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

// HELPER FUNCTIONS
/**
 * Replaces all double quoted strings in the input string with `"0"`, `"1"`, etc.
 * @param input - The Accept header string.
 *
 * @returns The transformed string and a map with keys `"0"`, etc. and values the original string that was there.
 */
const transformQuotedStrings = (input: string): { result: string; replacements: { [id: string]: string } } => {
  let idx = 0;
  const replacements: { [id: string]: string } = {};
  const result = input.replace(/"(?:[^"\\]|\\.)*"/gu, (match): string => {
    const replacement = `"${idx}"`;
    replacements[replacement] = match;
    idx += 1;
    return replacement;
  });
  return { result, replacements };
};

const splitAndClean = (input: string): string[] =>
  input.split(',')
    .map((part): string => part.trim())
    .filter((part): boolean => part.length > 0);

/**
 * Parses a single media range with corresponding parameters from an Accept header.
 * For every parameter value that is a double quoted string,
 * we check if it is a key in the replacements map.
 * If yes the value from the map gets inserted instead.
 * @param part - A string corresponding to a media range and its corresponding parameters.
 * @param replacements - The double quoted strings that need to be replaced.
 *
 * @returns {@link Accept} object corresponding to the header string.
 */
const parseAcceptPart = (part: string, replacements: { [id: string]: string }): Accept => {
  const [ range, ...parameters ] = part.split(';').map((param): string => param.trim());
  let weight = 1;
  const mediaTypeParams: { [key: string]: string } = {};
  const extensionParams: { [key: string]: string } = {};
  let map = mediaTypeParams;
  parameters.forEach((param): void => {
    const [ name, value ] = param.split('=');
    let actualValue = value;

    if (value && value.length > 0 && value.startsWith('"') && replacements[value]) {
      actualValue = replacements[value];
    }

    if (name === 'q') {
      // Extension parameters appear after the q value
      map = extensionParams;
      weight = parseFloat(actualValue);
    } else {
      // Value is optional for extension parameters
      map[name] = actualValue || '';
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
};

/**
 * Parses an Accept-* header where each part is only a value and a weight, so roughly /.*(q=.*)?/ separated by commas.
 * @param input - Input header string.
 *
 * @returns An array of ranges and weights.
 */
const parseNoParameters = (input: string): { range: string; weight: number }[] => {
  const parts = splitAndClean(input);

  return parts.map((part): { range: string; weight: number } => {
    const [ range, qvalue ] = part.split(';').map((param): string => param.trim());
    const result = { range, weight: 1 };
    if (qvalue) {
      result.weight = parseFloat(qvalue.split('=')[1]);
    }
    return result;
  }).sort((left, right): number => right.weight - left.weight);
};

// EXPORTED FUNCTIONS

/**
 * Parses an Accept header string.
 * No validation is done so this assumes a valid input string.
 *
 * @param input - The Accept header string.
 *
 * @returns An array of {@link Accept} objects, sorted by weight.
 */
export const parseAccept = (input: string): Accept[] => {
  // Quoted strings could prevent split from having correct results
  const { result, replacements } = transformQuotedStrings(input);
  return splitAndClean(result)
    .map((part): Accept => parseAcceptPart(part, replacements))
    .sort((left, right): number => right.weight - left.weight);
};

/**
 * Parses an Accept-Charset header string.
 * No validation is done so this assumes a valid input string.
 *
 * @param input - The Accept-Charset header string.
 *
 * @returns An array of {@link AcceptCharset} objects, sorted by weight.
 */
export const parseAcceptCharset = (input: string): AcceptCharset[] => parseNoParameters(input);

/**
 * Parses an Accept-Encoding header string.
 * No validation is done so this assumes a valid input string.
 *
 * @param input - The Accept-Encoding header string.
 *
 * @returns An array of {@link AcceptEncoding} objects, sorted by weight.
 */
export const parseAcceptEncoding = (input: string): AcceptEncoding[] => parseNoParameters(input);

/**
 * Parses an Accept-Language header string.
 * No validation is done so this assumes a valid input string.
 *
 * @param input - The Accept-Language header string.
 *
 * @returns An array of {@link AcceptLanguage} objects, sorted by weight.
 */
export const parseAcceptLanguage = (input: string): AcceptLanguage[] => parseNoParameters(input);
