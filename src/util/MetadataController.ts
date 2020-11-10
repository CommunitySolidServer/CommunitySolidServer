import type { Readable } from 'stream';
import arrayifyStream from 'arrayify-stream';
import { DataFactory, StreamParser, StreamWriter } from 'n3';
import type { NamedNode, Quad } from 'rdf-js';
import streamifyArray from 'streamify-array';
import { RepresentationMetadata } from '../ldp/representation/RepresentationMetadata';
import { TEXT_TURTLE } from './ContentTypes';
import { LDP, RDF } from './UriConstants';
import { toNamedNode } from './UriUtil';
import { pipeSafe, pushQuad } from './Util';

export class MetadataController {
  /**
   * Helper function to generate type quads for a Container or Resource.
   * @param subject - Subject for the new quads.
   * @param isContainer - If the identifier corresponds to a container.
   *
   * @returns The generated quads.
   */
  public generateResourceQuads(subject: NamedNode, isContainer: boolean): Quad[] {
    const quads: Quad[] = [];
    if (isContainer) {
      pushQuad(quads, subject, toNamedNode(RDF.type), toNamedNode(LDP.Container));
      pushQuad(quads, subject, toNamedNode(RDF.type), toNamedNode(LDP.BasicContainer));
    }
    pushQuad(quads, subject, toNamedNode(RDF.type), toNamedNode(LDP.Resource));

    return quads;
  }

  /**
   * Helper function to generate the quads describing that the resource URIs are children of the container URI.
   * @param containerURI - The URI of the container.
   * @param childURIs - The URI of the child resources.
   *
   * @returns The generated quads.
   */
  public generateContainerContainsResourceQuads(containerURI: NamedNode, childURIs: string[]): Quad[] {
    return new RepresentationMetadata(containerURI, { [LDP.contains]: childURIs.map(DataFactory.namedNode) }).quads();
  }

  /**
   * Helper function for serializing an array of quads, with as result a Readable object.
   * @param quads - The array of quads.
   *
   * @returns The Readable object.
   */
  public serializeQuads(quads: Quad[]): Readable {
    return pipeSafe(streamifyArray(quads), new StreamWriter({ format: TEXT_TURTLE }));
  }

  /**
   * Helper function to convert a Readable into an array of quads.
   * @param readable - The readable object.
   *
   * @returns A promise containing the array of quads.
   */
  public async parseQuads(readable: Readable): Promise<Quad[]> {
    return await arrayifyStream(pipeSafe(readable, new StreamParser({ format: TEXT_TURTLE })));
  }
}
