import { DataFactory, Store } from 'n3';
import type { BlankNode, DefaultGraph, Literal, NamedNode, Quad, Term } from 'rdf-js';
import { getLoggerFor } from '../../logging/LogUtil';
import { InternalServerError } from '../../util/errors/InternalServerError';
import type { ContentType } from '../../util/HeaderUtil';
import { parseContentTypeWithParameters, parseContentType } from '../../util/HeaderUtil';
import { toNamedTerm, toObjectTerm, toCachedNamedNode, isTerm, toLiteral } from '../../util/TermUtil';
import { CONTENT_TYPE, CONTENT_TYPE_TERM, CONTENT_LENGTH_TERM, XSD, SOLID_META, RDFS } from '../../util/Vocabularies';
import type { ResourceIdentifier } from './ResourceIdentifier';
import { isResourceIdentifier } from './ResourceIdentifier';

export type MetadataIdentifier = ResourceIdentifier | NamedNode | BlankNode;
export type MetadataValue = NamedNode | Literal | string | (NamedNode | Literal | string)[];
export type MetadataRecord = Record<string, MetadataValue>;
export type MetadataGraph = NamedNode | BlankNode | DefaultGraph | string;

/**
 * Determines whether the object is a `RepresentationMetadata`.
 */
export function isRepresentationMetadata(object: any): object is RepresentationMetadata {
  return typeof object?.setMetadata === 'function';
}

/**
 * Stores the metadata triples and provides methods for easy access.
 * Most functions return the metadata object to allow for chaining.
 */
export class RepresentationMetadata {
  protected readonly logger = getLoggerFor(this);

  private store: Store;
  private id: NamedNode | BlankNode;

  /**
   * @param identifier - Identifier of the resource relevant to this metadata.
   *                     A blank node will be generated if none is provided.
   *                     Strings will be converted to named nodes. @ignored
   * @param overrides - Key/value map of extra values that need to be added to the metadata. @ignored
   *
   * `@ignored` tag is necessary for Components-Generator.js
   */
  public constructor(identifier?: MetadataIdentifier, overrides?: MetadataRecord);

  /**
   * @param metadata - Starts as a copy of the input metadata.
   * @param overrides - Key/value map of extra values that need to be added to the metadata.
   *                    Will override values that were set by the input metadata.
   */
  public constructor(metadata?: RepresentationMetadata, overrides?: MetadataRecord);

  /**
   * @param identifier - Identifier of the resource relevant to this metadata.
   * @param contentType - Override for the content type of the representation.
   */
  public constructor(identifier?: MetadataIdentifier, contentType?: string);

  /**
   * @param metadata - Starts as a copy of the input metadata.
   * @param contentType - Override for the content type of the representation.
   */
  public constructor(metadata?: RepresentationMetadata, contentType?: string);

  /**
   * @param contentType - The content type of the representation.
   */
  public constructor(contentType?: string);

  /**
   * @param metadata - Metadata values (defaulting to content type if a string)
   */
  public constructor(metadata?: RepresentationMetadata | MetadataRecord | string);

  public constructor(
    input?: MetadataIdentifier | RepresentationMetadata | MetadataRecord | string,
    overrides?: MetadataRecord | string,
  ) {
    this.store = new Store();
    if (isResourceIdentifier(input)) {
      this.id = DataFactory.namedNode(input.path);
    } else if (isTerm(input)) {
      this.id = input;
    } else if (isRepresentationMetadata(input)) {
      this.id = input.identifier;
      this.addQuads(input.quads());
    } else {
      overrides = input;
      this.id = this.store.createBlankNode();
    }

    if (overrides) {
      if (typeof overrides === 'string') {
        overrides = { [CONTENT_TYPE]: overrides };
      }
      this.setOverrides(overrides);
    }
  }

  private setOverrides(overrides: Record<string, MetadataValue>): void {
    for (const predicate of Object.keys(overrides)) {
      const namedPredicate = toCachedNamedNode(predicate);
      this.removeAll(namedPredicate);

      let objects = overrides[predicate];
      if (!Array.isArray(objects)) {
        objects = [ objects ];
      }
      for (const object of objects) {
        this.store.addQuad(this.id, namedPredicate, toObjectTerm(object, true));
      }
    }
  }

  /**
   * @returns All matching metadata quads.
   */
  public quads(
    subject: NamedNode | BlankNode | string | null = null,
    predicate: NamedNode | string | null = null,
    object: NamedNode | BlankNode | Literal | string | null = null,
    graph: MetadataGraph | null = null,
  ): Quad[] {
    return this.store.getQuads(subject, predicate, object, graph);
  }

  /**
   * Identifier of the resource this metadata is relevant to.
   * Will update all relevant triples if this value gets changed.
   */
  public get identifier(): NamedNode | BlankNode {
    return this.id;
  }

  public set identifier(id: NamedNode | BlankNode) {
    if (!id.equals(this.id)) {
      // Convert all instances of the old identifier to the new identifier in the stored quads
      const quads = this.quads().map((quad): Quad => {
        if (quad.subject.equals(this.id)) {
          return DataFactory.quad(id, quad.predicate, quad.object, quad.graph);
        }
        if (quad.object.equals(this.id)) {
          return DataFactory.quad(quad.subject, quad.predicate, id, quad.graph);
        }
        return quad;
      });
      this.store = new Store(quads);
      this.id = id;
    }
  }

  /**
   * Helper function to import all entries from the given metadata.
   * If the new metadata has a different identifier the internal one will be updated.
   * @param metadata - Metadata to import.
   */
  public setMetadata(metadata: RepresentationMetadata): this {
    this.identifier = metadata.identifier;
    this.addQuads(metadata.quads());
    return this;
  }

  /**
   * @param subject - Subject of quad to add.
   * @param predicate - Predicate of quad to add.
   * @param object - Object of quad to add.
   * @param graph - Optional graph of quad to add.
   */
  public addQuad(
    subject: NamedNode | BlankNode | string,
    predicate: NamedNode | string,
    object: NamedNode | BlankNode | Literal | string,
    graph?: MetadataGraph,
  ): this {
    this.store.addQuad(toNamedTerm(subject),
      toCachedNamedNode(predicate),
      toObjectTerm(object, true),
      graph ? toNamedTerm(graph) : undefined);
    return this;
  }

  /**
   * @param quads - Quads to add to the metadata.
   */
  public addQuads(quads: Quad[]): this {
    this.store.addQuads(quads);
    return this;
  }

  /**
   * @param subject - Subject of quad to remove.
   * @param predicate - Predicate of quad to remove.
   * @param object - Object of quad to remove.
   * @param graph - Optional graph of quad to remove.
   */
  public removeQuad(
    subject: NamedNode | BlankNode | string,
    predicate: NamedNode | string,
    object: NamedNode | BlankNode | Literal | string,
    graph?: MetadataGraph,
  ): this {
    const quads = this.quads(toNamedTerm(subject),
      toCachedNamedNode(predicate),
      toObjectTerm(object, true),
      graph ? toNamedTerm(graph) : undefined);
    return this.removeQuads(quads);
  }

  /**
   * @param quads - Quads to remove from the metadata.
   */
  public removeQuads(quads: Quad[]): this {
    this.store.removeQuads(quads);
    return this;
  }

  /**
   * Adds a value linked to the identifier. Strings get converted to literals.
   * @param predicate - Predicate linking identifier to value.
   * @param object - Value(s) to add.
   * @param graph - Optional graph of where to add the values to.
   */
  public add(predicate: NamedNode | string, object: MetadataValue, graph?: MetadataGraph): this {
    return this.forQuads(predicate, object, (pred, obj): any => this.addQuad(this.id, pred, obj, graph));
  }

  /**
   * Removes the given value from the metadata. Strings get converted to literals.
   * @param predicate - Predicate linking identifier to value.
   * @param object - Value(s) to remove.
   * @param graph - Optional graph of where to remove the values from.
   */
  public remove(predicate: NamedNode | string, object: MetadataValue, graph?: MetadataGraph): this {
    return this.forQuads(predicate, object, (pred, obj): any => this.removeQuad(this.id, pred, obj, graph));
  }

  /**
   * Helper function to simplify add/remove
   * Runs the given function on all predicate/object pairs, but only converts the predicate to a named node once.
   */
  private forQuads(predicate: NamedNode | string, object: MetadataValue,
    forFn: (pred: NamedNode, obj: NamedNode | Literal) => void): this {
    const predicateNode = toCachedNamedNode(predicate);
    const objects = Array.isArray(object) ? object : [ object ];
    for (const obj of objects) {
      forFn(predicateNode, toObjectTerm(obj, true));
    }
    return this;
  }

  /**
   * Removes all values linked through the given predicate.
   * @param predicate - Predicate to remove.
   * @param graph - Optional graph where to remove from.
   */
  public removeAll(predicate: NamedNode | string, graph?: MetadataGraph): this {
    this.removeQuads(this.store.getQuads(this.id, toCachedNamedNode(predicate), null, graph ?? null));
    return this;
  }

  /**
   * Finds all object values matching the given predicate and/or graph.
   * @param predicate - Optional predicate to get the values for.
   * @param graph - Optional graph where to get from.
   *
   * @returns An array with all matches.
   */
  public getAll(predicate: NamedNode | string, graph?: MetadataGraph): Term[] {
    return this.store.getQuads(this.id, toCachedNamedNode(predicate), null, graph ?? null)
      .map((quad): Term => quad.object);
  }

  /**
   * @param predicate - Predicate to get the value for.
   * @param graph - Optional graph where the triple should be found.
   *
   * @throws Error
   * If there are multiple matching values.
   *
   * @returns The corresponding value. Undefined if there is no match
   */
  public get(predicate: NamedNode | string, graph?: MetadataGraph): Term | undefined {
    const terms = this.getAll(predicate, graph);
    if (terms.length === 0) {
      return;
    }
    if (terms.length > 1) {
      this.logger.error(`Multiple results for ${typeof predicate === 'string' ? predicate : predicate.value}`);
      throw new InternalServerError(
        `Multiple results for ${typeof predicate === 'string' ? predicate : predicate.value}`,
      );
    }
    return terms[0];
  }

  /**
   * Sets the value for the given predicate, removing all other instances.
   * In case the object is undefined this is identical to `removeAll(predicate)`.
   * @param predicate - Predicate linking to the value.
   * @param object - Value(s) to set.
   * @param graph - Optional graph where the triple should be stored.
   */
  public set(predicate: NamedNode | string, object?: MetadataValue, graph?: MetadataGraph): this {
    this.removeAll(predicate, graph);
    if (object) {
      this.add(predicate, object, graph);
    }
    return this;
  }

  private setContentTypeParams(input: ContentType | string | undefined): void {
    if (input === undefined) {
      this.removeContentTypeParameters();
      return;
    }
    if (typeof input === 'string') {
      input = parseContentTypeWithParameters(input);
    }

    // Make sure complete Content-Type RDF structure is gone
    this.removeContentTypeParameters();

    Object.entries(input.parameters ?? []).forEach(([ paramKey, paramValue ], idx): void => {
      const paramNode = DataFactory.blankNode(`parameter${idx + 1}`);
      this.addQuad(this.id, SOLID_META.terms.ContentTypeParameter, paramNode);
      this.addQuad(paramNode, RDFS.terms.label, paramKey);
      this.addQuad(paramNode, SOLID_META.terms.value, paramValue);
    });
  }

  /**
   * Parse the internal RDF structure to retrieve the Record with ContentType Parameters.
   * @returns An Record&lt;string,string&gt; object with Content-Type parameters and their values.
   */
  private getContentTypeParams(): Record<string, string> | undefined {
    const params = this.getAll(SOLID_META.terms.ContentTypeParameter);
    return params.length > 0 ?
      params.reduce((acc, term): Record<string, string> => {
        const key = this.store.getObjects(term, RDFS.terms.label, null)[0].value;
        const { value } = this.store.getObjects(term, SOLID_META.terms.value, null)[0];
        return { ...acc, [key]: value };
      }, {}) :
      undefined;
  }

  private removeContentTypeParameters(): void {
    const params = this.store.getQuads(this.id, SOLID_META.terms.ContentTypeParameter, null, null);
    params.forEach((quad): void => {
      const labels = this.store.getQuads(quad.object, RDFS.terms.label, null, null);
      const values = this.store.getQuads(quad.object, SOLID_META.terms.value, null, null);
      this.store.removeQuads(labels);
      this.store.removeQuads(values);
    });
    this.store.removeQuads(params);
  }

  // Syntactic sugar for common predicates

  /**
   * Shorthand for the CONTENT_TYPE predicate.
   */
  public get contentType(): string | undefined {
    return this.get(CONTENT_TYPE_TERM)?.value;
  }

  public set contentType(input) {
    this.set(CONTENT_TYPE_TERM, input);
    this.setContentTypeParams(input);
  }

  /**
  * Shorthand for the CONTENT_LENGTH predicate.
  */
  public get contentLength(): number | undefined {
    const length = this.get(CONTENT_LENGTH_TERM);
    return length?.value ? Number(length.value) : undefined;
  }

  public set contentLength(input) {
    if (input) {
      this.set(CONTENT_LENGTH_TERM, toLiteral(input, XSD.terms.integer));
    }
  }

  /**
   * Shorthand for the ContentType as an object (with parameters)
   */
  public get contentTypeObject(): ContentType | undefined {
    return this.contentType ?
      {
        value: parseContentType(this.contentType).type,
        parameters: this.getContentTypeParams(),
      } :
      undefined;
  }
}
