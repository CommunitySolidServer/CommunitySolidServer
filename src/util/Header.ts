// The interfaces here are split off from HttpErrorUtil.ts to prevent a dependency loop in RepresentationMetadata

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

/**
 * Contents of an HTTP Content-Type Header.
 * Optional parameters Record is included.
 */
export class ContentType {
  public constructor(public value: string, public parameters: Record<string, string> = {}) {}

  /**
   * Serialize this ContentType object to a ContentType header appropriate value string.
   *
   * @returns The value string, including parameters, if present.
   */
  public toHeaderValueString(): string {
    const parameterStrings = Object.entries(this.parameters)
      .sort((entry1, entry2): number => entry1[0].localeCompare(entry2[0]))
      .map(([ key, value ]): string => `${key}=${value}`);
    return [ this.value, ...parameterStrings ].join('; ');
  }
}

export interface LinkEntryParameters extends Record<string, string> {
  /** Required rel properties of Link entry */
  rel: string;
}

export interface LinkEntry {
  target: string;
  parameters: LinkEntryParameters;
}

// BNF based on https://tools.ietf.org/html/rfc7231
//
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

// REUSED REGEXES
export const TCHAR = /[-\w!#$%&'*+.^`|~]/u;
export const TOKEN = new RegExp(`^${TCHAR.source}+$`, 'u');
export const SIMPLE_MEDIA_RANGE = new RegExp(`^${TCHAR.source}+/${TCHAR.source}+$`, 'u');
export const QUOTED_STRING =
  /^"(?:[\t !\u0023-\u005B\u005D-\u007E\u0080-\u00FF]|(\\[\t\u0020-\u007E\u0080-\u00FF]))*"$/u;
export const QVALUE = /^(?:(0(?:\.\d{0,3})?)|(1(?:\.0{0,3})?))$/u;
