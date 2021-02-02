import { DataFactory, Store } from 'n3';
import type { BlankNode, Literal, NamedNode, Quad, Term } from 'rdf-js';
import { getLoggerFor } from '../../logging/LogUtil';
import { toSubjectTerm, toObjectTerm, toCachedNamedNode, isTerm } from '../../util/TermUtil';
import { CONTENT_TYPE, CONTENT_TYPE_TERM } from '../../util/Vocabularies';
import type { ResourceIdentifier } from './ResourceIdentifier';
import { isResourceIdentifier } from './ResourceIdentifier';

export type MetadataIdentifier = ResourceIdentifier | NamedNode | BlankNode;
export type MetadataValue = NamedNode | Literal | string | (NamedNode | Literal | string)[];
export type MetadataRecord = Record<string, MetadataValue>;

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
   * @param overrides - Metadata values (defaulting to content type if a string)
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
    subject: Term | null = null,
    predicate: Term | null = null,
    object: Term | null = null,
    graph: Term | null = null,
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
   */
  public addQuad(
    subject: NamedNode | BlankNode | string,
    predicate: NamedNode | string,
    object: NamedNode | BlankNode | Literal | string,
  ): this {
    this.store.addQuad(toSubjectTerm(subject), toCachedNamedNode(predicate), toObjectTerm(object, true));
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
   */
  public removeQuad(
    subject: NamedNode | BlankNode | string,
    predicate: NamedNode | string,
    object: NamedNode | BlankNode | Literal | string,
  ): this {
    this.store.removeQuad(toSubjectTerm(subject), toCachedNamedNode(predicate), toObjectTerm(object, true));
    return this;
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
   */
  public add(predicate: NamedNode | string, object: MetadataValue): this {
    return this.forQuads(predicate, object, (pred, obj): any => this.addQuad(this.id, pred, obj));
  }

  /**
   * Removes the given value from the metadata. Strings get converted to literals.
   * @param predicate - Predicate linking identifier to value.
   * @param object - Value(s) to remove.
   */
  public remove(predicate: NamedNode | string, object: MetadataValue): this {
    return this.forQuads(predicate, object, (pred, obj): any => this.removeQuad(this.id, pred, obj));
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
   */
  public removeAll(predicate: NamedNode | string): this {
    this.removeQuads(this.store.getQuads(this.id, toCachedNamedNode(predicate), null, null));
    return this;
  }

  /**
   * Finds all object values matching the given predicate.
   * @param predicate - Predicate to get the values for.
   *
   * @returns An array with all matches.
   */
  public getAll(predicate: NamedNode | string): Term[] {
    return this.store.getQuads(this.id, toCachedNamedNode(predicate), null, null)
      .map((quad): Term => quad.object);
  }

  /**
   * @param predicate - Predicate to get the value for.
   *
   * @throws Error
   * If there are multiple matching values.
   *
   * @returns The corresponding value. Undefined if there is no match
   */
  public get(predicate: NamedNode | string): Term | undefined {
    const terms = this.getAll(predicate);
    if (terms.length === 0) {
      return;
    }
    if (terms.length > 1) {
      this.logger.error(`Multiple results for ${typeof predicate === 'string' ? predicate : predicate.value}`);
      throw new Error(`Multiple results for ${typeof predicate === 'string' ? predicate : predicate.value}`);
    }
    return terms[0];
  }

  /**
   * Sets the value for the given predicate, removing all other instances.
   * In case the object is undefined this is identical to `removeAll(predicate)`.
   * @param predicate - Predicate linking to the value.
   * @param object - Value(s) to set.
   */
  public set(predicate: NamedNode | string, object?: MetadataValue): this {
    this.removeAll(predicate);
    if (object) {
      this.add(predicate, object);
    }
    return this;
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
  }
}
