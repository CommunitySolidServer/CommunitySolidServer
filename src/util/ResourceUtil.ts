import { DataFactory } from 'n3';
import type { NamedNode, Quad } from 'rdf-js';
import { RepresentationMetadata } from '../ldp/representation/RepresentationMetadata';
import { pushQuad } from './QuadUtil';
import { LDP, RDF } from './UriConstants';
import { toNamedNode } from './UriUtil';

/**
 * Helper function to generate type quads for a Container or Resource.
 * @param subject - Subject for the new quads.
 * @param isContainer - If the identifier corresponds to a container.
 *
 * @returns The generated quads.
 */
export const generateResourceQuads = (subject: NamedNode, isContainer: boolean): Quad[] => {
  const quads: Quad[] = [];
  if (isContainer) {
    pushQuad(quads, subject, toNamedNode(RDF.type), toNamedNode(LDP.Container));
    pushQuad(quads, subject, toNamedNode(RDF.type), toNamedNode(LDP.BasicContainer));
  }
  pushQuad(quads, subject, toNamedNode(RDF.type), toNamedNode(LDP.Resource));

  return quads;
};

/**
 * Helper function to generate the quads describing that the resource URIs are children of the container URI.
 * @param containerURI - The URI of the container.
 * @param childURIs - The URI of the child resources.
 *
 * @returns The generated quads.
 */
export const generateContainmentQuads = (containerURI: NamedNode, childURIs: string[]): Quad[] =>
  new RepresentationMetadata(containerURI, { [LDP.contains]: childURIs.map(DataFactory.namedNode) }).quads();
