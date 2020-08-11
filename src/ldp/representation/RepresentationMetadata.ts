/**
 * Contains metadata relevant to a representation.
 */
import { Quad } from 'rdf-js';

/**
 * Metadata corresponding to a {@link Representation}.
 */
export interface RepresentationMetadata {
  /**
   * All metadata triples of the resource.
   */
  raw: Quad[];
  /**
   * The metadata profiles.
   */
  profiles: string[];
  /**
   * Optional size of the representation.
   */
  byteSize?: number;
  /**
   * Optional content type of the representation.
   */
  contentType?: string;
  /**
   * Optional encoding of the representation.
   */
  encoding?: string;
  /**
   * Optional language of the representation.
   */
  language?: string;
  /**
   * Optional timestamp of the representation.
   */
  dateTime?: Date;
  /**
   * Optional link type of the representation.
   * E.g. LINK_TYPE_LDP_C
   */
  linkType?: string;
  /**
   * Optional slug of the representation.
   * Used to suggest the URI for the resource created.
   */
  slug?: string;
}
