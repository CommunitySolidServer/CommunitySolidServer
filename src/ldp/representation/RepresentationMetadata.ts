import { quad as createQuad, literal, namedNode } from '@rdfjs/data-model';
import { Store } from 'n3';
import type { BlankNode, Literal, NamedNode, Quad, Term } from 'rdf-js';

/**
 * Stores the metadata triples and provides methods for easy access.
 */
export class RepresentationMetadata {
  private store: Store;
  private id: NamedNode | BlankNode;

  /**
   * @param identifier - Identifier of the resource relevant to this metadata.
   *                     A blank node will be generated if none is provided.
   *                     Strings will be converted to named nodes. @ignored
   * @param quads - Quads to fill the metadata with. @ignored
   *
   * `@ignored` tags are necessary for Components-Generator.js
   */
  public constructor(identifier?: NamedNode | BlankNode | string, quads?: Quad[]) {
    this.store = new Store(quads);
    if (identifier) {
      if (typeof identifier === 'string') {
        this.id = namedNode(identifier);
      } else {
        this.id = identifier;
      }
    } else {
      this.id = this.store.createBlankNode();
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
    const quads = this.quads().map((quad): Quad => {
      if (quad.subject.equals(this.id)) {
        return createQuad(id, quad.predicate, quad.object, quad.graph);
      }
      if (quad.object.equals(this.id)) {
        return createQuad(quad.subject, quad.predicate, id, quad.graph);
      }
      return quad;
    });
    this.store = new Store(quads);
    this.id = id;
  }

  /**
   * @param quads - Quads to add to the metadata.
   */
  public addQuads(quads: Quad[]): void {
    this.store.addQuads(quads);
  }

  /**
   * @param quads - Quads to remove from the metadata.
   */
  public removeQuads(quads: Quad[]): void {
    this.store.removeQuads(quads);
  }

  /**
   * Adds a value linked to the identifier. Strings get converted to literals.
   * @param predicate - Predicate linking identifier to value.
   * @param object - Value to add.
   */
  public add(predicate: NamedNode, object: NamedNode | Literal | string): void {
    this.store.addQuad(this.id, predicate, typeof object === 'string' ? literal(object) : object);
  }

  /**
   * Removes the given value from the metadata. Strings get converted to literals.
   * @param predicate - Predicate linking identifier to value.
   * @param object - Value to remove.
   */
  public remove(predicate: NamedNode, object: NamedNode | Literal | string): void {
    this.store.removeQuad(this.id, predicate, typeof object === 'string' ? literal(object) : object);
  }

  /**
   * Removes all values linked through the given predicate.
   * @param predicate - Predicate to remove.
   */
  public removeAll(predicate: NamedNode): void {
    this.removeQuads(this.store.getQuads(this.id, predicate, null, null));
  }

  /**
   * @param predicate - Predicate to get the value for.
   *
   * @throws Error
   * If there are multiple matching values.
   *
   * @returns The corresponding value. Undefined if there is no match
   */
  public get(predicate: NamedNode): Term | undefined {
    const quads = this.store.getQuads(this.id, predicate, null, null);
    if (quads.length === 0) {
      return;
    }
    if (quads.length > 1) {
      throw new Error(`Multiple results for ${predicate.value}`);
    }
    return quads[0].object;
  }

  /**
   * Sets the value for the given predicate, removing all other instances.
   * @param predicate - Predicate linking to the value.
   * @param object - Value to set.
   */
  public set(predicate: NamedNode, object: NamedNode | Literal | string): void {
    this.removeAll(predicate);
    this.add(predicate, object);
  }
}
