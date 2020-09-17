import { DataFactory, Store } from 'n3';
import type { BlankNode, Literal, NamedNode, Quad, Term } from 'rdf-js';
import { toObjectTerm, toNamedNode, isTerm } from '../../util/UriUtil';

export type MetadataOverrideValue = NamedNode | Literal | string | (NamedNode | Literal | string)[];

/**
 * Stores the metadata triples and provides methods for easy access.
 * Most functions return the metadata object to allow for chaining.
 */
export class RepresentationMetadata {
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
  public constructor(identifier?: NamedNode | BlankNode | string, overrides?: { [pred: string]: MetadataOverrideValue});

  /**
   * @param metadata - Starts as a copy of the input metadata.
   * @param overrides - Key/value map of extra values that need to be added to the metadata.
   *                    Will override values that were set by the input metadata.
   */
  public constructor(metadata?: RepresentationMetadata, overrides?: { [pred: string]: MetadataOverrideValue});

  /**
   * @param overrides - Key/value map of extra values that need to be added to the metadata.
   */
  public constructor(overrides?: { [pred: string]: MetadataOverrideValue});

  public constructor(
    input?: NamedNode | BlankNode | string | RepresentationMetadata | { [pred: string]: MetadataOverrideValue},
    overrides?: { [pred: string]: MetadataOverrideValue},
  ) {
    this.store = new Store();
    if (typeof input === 'string') {
      this.id = DataFactory.namedNode(input);
    } else if (isTerm(input)) {
      this.id = input;
    } else if (input instanceof RepresentationMetadata) {
      this.id = input.identifier;
      this.addQuads(input.quads());
    } else {
      overrides = input;
      this.id = this.store.createBlankNode();
    }

    if (overrides) {
      this.setOverrides(overrides);
    }
  }

  private setOverrides(overrides: { [pred: string]: MetadataOverrideValue}): void {
    for (const predicate of Object.keys(overrides)) {
      const namedPredicate = toNamedNode(predicate);
      this.removeAll(namedPredicate);

      let objects = overrides[predicate];
      if (!Array.isArray(objects)) {
        objects = [ objects ];
      }
      for (const object of objects.map(toObjectTerm)) {
        this.store.addQuad(this.id, namedPredicate, object);
      }
    }
  }

  /**
   * @returns All metadata quads.
   */
  public quads(): Quad[] {
    return this.store.getQuads(null, null, null, null);
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
   * @param quads - Quads to add to the metadata.
   */
  public addQuads(quads: Quad[]): this {
    this.store.addQuads(quads);
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
   * @param object - Value to add.
   */
  public add(predicate: NamedNode | string, object: NamedNode | Literal | string): this {
    this.store.addQuad(this.id, toNamedNode(predicate), toObjectTerm(object));
    return this;
  }

  /**
   * Removes the given value from the metadata. Strings get converted to literals.
   * @param predicate - Predicate linking identifier to value.
   * @param object - Value to remove.
   */
  public remove(predicate: NamedNode | string, object: NamedNode | Literal | string): this {
    this.store.removeQuad(this.id, toNamedNode(predicate), toObjectTerm(object));
    return this;
  }

  /**
   * Removes all values linked through the given predicate.
   * @param predicate - Predicate to remove.
   */
  public removeAll(predicate: NamedNode | string): this {
    this.removeQuads(this.store.getQuads(this.id, toNamedNode(predicate), null, null));
    return this;
  }

  /**
   * Finds all object values matching the given predicate.
   * @param predicate - Predicate to get the values for.
   *
   * @returns An array with all matches.
   */
  public getAll(predicate: NamedNode | string): Term[] {
    return this.store.getQuads(this.id, toNamedNode(predicate), null, null)
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
      throw new Error(`Multiple results for ${typeof predicate === 'string' ? predicate : predicate.value}`);
    }
    return terms[0];
  }

  /**
   * Sets the value for the given predicate, removing all other instances.
   * In case the object is undefined this is identical to `removeAll(predicate)`.
   * @param predicate - Predicate linking to the value.
   * @param object - Value to set.
   */
  public set(predicate: NamedNode | string, object?: NamedNode | Literal | string): this {
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
    return this.get(toNamedNode('contentType'))?.value;
  }

  public set contentType(input) {
    this.set(toNamedNode('contentType'), input);
  }
}
