import { DataFactory } from 'n3';
import type { NamedNode, Quad } from 'rdf-js';
import { RepresentationMetadata } from '../ldp/representation/RepresentationMetadata';
import { pushQuad } from './QuadUtil';
import { LDP, RDF } from './Vocabularies';

/**
 * Helper function to generate type quads for a Container or Resource.
 * @param subject - Subject for the new quads.
 * @param isContainer - If the identifier corresponds to a container.
 *
 * @returns The generated quads.
 */
export function generateResourceQuads(subject: NamedNode, isContainer: boolean): Quad[] {
  const quads: Quad[] = [];
  if (isContainer) {
    pushQuad(quads, subject, RDF.terms.type, LDP.terms.Container);
    pushQuad(quads, subject, RDF.terms.type, LDP.terms.BasicContainer);
  }
  pushQuad(quads, subject, RDF.terms.type, LDP.terms.Resource);

  return quads;
}

/**
 * Helper function to generate the quads describing that the resource URIs are children of the container URI.
 * @param containerURI - The URI of the container.
 * @param childURIs - The URI of the child resources.
 *
 * @returns The generated quads.
 */
export function generateContainmentQuads(containerURI: NamedNode, childURIs: string[]): Quad[] {
  return new RepresentationMetadata(containerURI,
    { [LDP.contains]: childURIs.map(DataFactory.namedNode) }).quads();
}
