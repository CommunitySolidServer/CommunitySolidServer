import { DataFactory, Store } from 'n3';
import type { BlankNode, DefaultGraph, Literal, NamedNode, Quad, Term } from '@rdfjs/types';
import { getLoggerFor } from '../../logging/LogUtil';
import { ContentType, SIMPLE_MEDIA_RANGE } from '../../util/Header';
import { isTerm, toLiteral, toNamedTerm, toObjectTerm } from '../../util/TermUtil';
import { CONTENT_LENGTH_TERM, CONTENT_TYPE_TERM, RDFS, SOLID_META, XSD } from '../../util/Vocabularies';
import type { ResourceIdentifier } from './ResourceIdentifier';
import { isResourceIdentifier } from './ResourceIdentifier';

export type MetadataIdentifier = ResourceIdentifier | NamedNode | BlankNode;
export type MetadataValue = NamedNode | BlankNode | Literal | string | (NamedNode | Literal | BlankNode | string)[];
export type MetadataRecord = Record<string, MetadataValue>;
export type MetadataGraph = NamedNode | BlankNode | DefaultGraph | string;

/**
 * Determines whether the object is a `RepresentationMetadata`.
 */
export function isRepresentationMetadata(object: unknown): object is RepresentationMetadata {
  return typeof (object as RepresentationMetadata)?.setMetadata === 'function';
}

// Caches named node conversions
const cachedNamedNodes: Record<string, NamedNode> = {};

/**
 * Converts the incoming name (URI or shorthand) to a named node.
 * The generated terms get cached to reduce the number of created nodes,
 * so only use this for internal constants!
 *
 * @param name - Predicate to potentially transform.
 */
function toCachedNamedNode(name: string): NamedNode {
  if (!(name in cachedNamedNodes)) {
    cachedNamedNodes[name] = DataFactory.namedNode(name);
  }
  return cachedNamedNodes[name];
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
  public constructor(identifier?: MetadataIdentifier, contentType?: string | ContentType);

  /**
   * @param metadata - Starts as a copy of the input metadata.
   * @param contentType - Override for the content type of the representation.
   */
  public constructor(metadata?: RepresentationMetadata, contentType?: string | ContentType);

  /**
   * @param contentType - The content type of the representation.
   */
  public constructor(contentType?: string | ContentType);

  /**
   * @param metadata - Metadata values (defaulting to content type if a string)
   */
  public constructor(metadata?: RepresentationMetadata | MetadataRecord | string);

  public constructor(
    input?: MetadataIdentifier | RepresentationMetadata | MetadataRecord | ContentType | string,
    overrides?: MetadataRecord | string | ContentType,
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
        this.contentType = overrides;
      } else if (overrides instanceof ContentType) {
        this.contentTypeObject = overrides;
      } else {
        this.setOverrides(overrides);
      }
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
    predicate: NamedNode | null = null,
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
   *
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
    predicate: NamedNode,
    object: NamedNode | BlankNode | Literal | string,
    graph?: MetadataGraph,
  ): this {
    this.store.addQuad(
      toNamedTerm(subject),
      predicate,
      toObjectTerm(object, true),
      graph ? toNamedTerm(graph) : undefined,
    );
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
    predicate: NamedNode,
    object: NamedNode | BlankNode | Literal | string,
    graph?: MetadataGraph,
  ): this {
    const quads = this.quads(
      toNamedTerm(subject),
      predicate,
      toObjectTerm(object, true),
      graph ? toNamedTerm(graph) : undefined,
    );
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
   *
   * @param predicate - Predicate linking identifier to value.
   * @param object - Value(s) to add.
   * @param graph - Optional graph of where to add the values to.
   */
  public add(predicate: NamedNode, object: MetadataValue, graph?: MetadataGraph): this {
    return this.forQuads(predicate, object, (pred, obj): unknown => this.addQuad(this.id, pred, obj, graph));
  }

  /**
   * Removes the given value from the metadata. Strings get converted to literals.
   *
   * @param predicate - Predicate linking identifier to value.
   * @param object - Value(s) to remove.
   * @param graph - Optional graph of where to remove the values from.
   */
  public remove(predicate: NamedNode, object: MetadataValue, graph?: MetadataGraph): this {
    return this.forQuads(predicate, object, (pred, obj): unknown => this.removeQuad(this.id, pred, obj, graph));
  }

  /**
   * Helper function to simplify add/remove
   * Runs the given function on all predicate/object pairs, but only converts the predicate to a named node once.
   */
  private forQuads(
    predicate: NamedNode,
    object: MetadataValue,
    forFn: (pred: NamedNode, obj: NamedNode | BlankNode | Literal) => void,
  ): this {
    const objects = Array.isArray(object) ? object : [ object ];
    for (const obj of objects) {
      forFn(predicate, toObjectTerm(obj, true));
    }
    return this;
  }

  /**
   * Removes all values linked through the given predicate.
   *
   * @param predicate - Predicate to remove.
   * @param graph - Optional graph where to remove from.
   */
  public removeAll(predicate: NamedNode, graph?: MetadataGraph): this {
    this.removeQuads(this.store.getQuads(this.id, predicate, null, graph ?? null));
    return this;
  }

  /**
   * Verifies if a specific triple can be found in the metadata.
   * Undefined parameters are interpreted as wildcards.
   */
  public has(
    predicate: NamedNode | string | null = null,
    object: NamedNode | BlankNode | Literal | string | null = null,
    graph: MetadataGraph | null = null,
  ): boolean {
    // This works with N3.js but at the time of writing the typings have not been updated yet.
    // If you see this line of code check if the typings are already correct and update this if so.
    return (this.store as unknown as {
      has: (subject: Term,
        predicate: Term | string | null,
        object: Term | string | null,
        graph: Term | string | null) => boolean;
    }).has(this.id, predicate, object, graph);
  }

  /**
   * Finds all object values matching the given predicate and/or graph.
   *
   * @param predicate - Optional predicate to get the values for.
   * @param graph - Optional graph where to get from.
   *
   * @returns An array with all matches.
   */
  public getAll(predicate: NamedNode, graph?: MetadataGraph): Term[] {
    return this.store.getQuads(this.id, predicate, null, graph ?? null)
      .map((quad): Term => quad.object);
  }

  /**
   * @param predicate - Predicate to get the value for.
   * @param graph - Optional graph where the triple should be found.
   *
   * @returns The corresponding value. Undefined if there is no match
   *
   * @throws Error
   * If there are multiple matching values.
   */
  public get(predicate: NamedNode, graph?: MetadataGraph): Term | undefined {
    const terms = this.getAll(predicate, graph);
    if (terms.length === 0) {
      return;
    }
    if (terms.length > 1) {
      this.logger.error(`Multiple results for ${predicate.value}`);
      // We can not use an `InternalServerError` here as otherwise errors and metadata files would depend on each other
      throw new Error(
        `Multiple results for ${predicate.value}`,
      );
    }
    return terms[0];
  }

  /**
   * Sets the value for the given predicate, removing all other instances.
   * In case the object is undefined this is identical to `removeAll(predicate)`.
   *
   * @param predicate - Predicate linking to the value.
   * @param object - Value(s) to set.
   * @param graph - Optional graph where the triple should be stored.
   */
  public set(predicate: NamedNode, object?: MetadataValue, graph?: MetadataGraph): this {
    this.removeAll(predicate, graph);
    if (object) {
      this.add(predicate, object, graph);
    }
    return this;
  }

  private setContentType(input?: ContentType | string): void {
    // Make sure complete Content-Type RDF structure is gone
    this.removeContentType();

    if (!input) {
      return;
    }

    if (typeof input === 'string') {
      // Simple check to estimate if this is a simple content type.
      // If not, mention that the `contentTypeObject` should be used instead.
      // Not calling `parseContentType` here as that would cause a dependency loop with `HttpError`.
      if (!SIMPLE_MEDIA_RANGE.test(input)) {
        // Not using an HttpError as HttpError depends on metadata
        throw new Error(
          'Only simple content types can be set by string. Use the `contentTypeObject` function for complexer types.',
        );
      }
      input = new ContentType(input);
    }

    for (const [ key, value ] of Object.entries(input.parameters)) {
      const node = DataFactory.blankNode();
      this.addQuad(this.id, SOLID_META.terms.contentTypeParameter, node);
      this.addQuad(node, RDFS.terms.label, key);
      this.addQuad(node, SOLID_META.terms.value, value);
    }

    // Set base content type string
    this.set(CONTENT_TYPE_TERM, input.value);
  }

  /**
   * Parse the internal RDF structure to retrieve the Record with ContentType Parameters.
   *
   * @returns A {@link ContentType} object containing the value and optional parameters if there is one.
   */
  private getContentType(): ContentType | undefined {
    const value = this.get(CONTENT_TYPE_TERM)?.value;
    if (!value) {
      return;
    }
    const params = this.getAll(SOLID_META.terms.contentTypeParameter);
    const parameters = Object.fromEntries(params.map((param): [string, string] => {
      const labels = this.store.getObjects(param, RDFS.terms.label, null);
      const values = this.store.getObjects(param, SOLID_META.terms.value, null);
      if (labels.length !== 1 || values.length !== 1) {
        this.logger.error(`Detected invalid content-type metadata for ${this.id.value}`);
        return [ 'invalid', '' ];
      }
      return [ labels[0].value, values[0].value ];
    }));
    return new ContentType(value, parameters);
  }

  private removeContentType(): void {
    this.removeAll(CONTENT_TYPE_TERM);
    const params = this.quads(this.id, SOLID_META.terms.contentTypeParameter);
    for (const quad of params) {
      const paramEntries = this.quads(quad.object as BlankNode);
      this.store.removeQuads(paramEntries);
    }
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
    this.setContentType(input);
  }

  /**
   * Shorthand for the ContentType as an object (with parameters)
   */
  public get contentTypeObject(): ContentType | undefined {
    return this.getContentType();
  }

  public set contentTypeObject(contentType) {
    this.setContentType(contentType);
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
}
