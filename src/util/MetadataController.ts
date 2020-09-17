import type { Stats } from 'fs';
import type { Readable } from 'stream';
import arrayifyStream from 'arrayify-stream';
import { DataFactory, StreamParser, StreamWriter } from 'n3';
import type { Quad } from 'rdf-js';
import streamifyArray from 'streamify-array';
import { RepresentationMetadata } from '../ldp/representation/RepresentationMetadata';
import { TEXT_TURTLE } from './ContentTypes';
import { DCTERMS, LDP, POSIX, RDF, XSD } from './UriConstants';
import { getNamedNode, getTypedLiteral } from './UriUtil';
import { pipeStreamsAndErrors } from './Util';

export class MetadataController {
  /**
   * Helper function to generate quads for a Container or Resource.
   * @param uri - The URI for which the quads should be generated.
   * @param stats - The Stats of the subject.
   *
   * @returns The generated quads.
   */
  public generateResourceQuads(uri: string, stats: Stats): Quad[] {
    const metadata = new RepresentationMetadata(uri);
    if (stats.isDirectory()) {
      metadata.add(RDF.type, getNamedNode(LDP.Container));
      metadata.add(RDF.type, getNamedNode(LDP.BasicContainer));
    }
    metadata.add(RDF.type, getNamedNode(LDP.Resource));
    metadata.add(POSIX.size, getTypedLiteral(stats.size, XSD.integer));
    metadata.add(DCTERMS.modified, getTypedLiteral(stats.mtime.toISOString(), XSD.dateTime));
    metadata.add(POSIX.mtime, getTypedLiteral(Math.floor(stats.mtime.getTime() / 1000), XSD.integer));

    return metadata.quads();
  }

  /**
   * Helper function to generate the quads describing that the resource URIs are children of the container URI.
   * @param containerURI - The URI of the container.
   * @param childURIs - The URI of the child resources.
   *
   * @returns The generated quads.
   */
  public generateContainerContainsResourceQuads(containerURI: string, childURIs: string[]): Quad[] {
    return new RepresentationMetadata(containerURI, { [LDP.contains]: childURIs.map(DataFactory.namedNode) }).quads();
  }

  /**
   * Helper function for serializing an array of quads, with as result a Readable object.
   * @param quads - The array of quads.
   *
   * @returns The Readable object.
   */
  public serializeQuads(quads: Quad[]): Readable {
    return pipeStreamsAndErrors(streamifyArray(quads), new StreamWriter({ format: TEXT_TURTLE }));
  }

  /**
   * Helper function to convert a Readable into an array of quads.
   * @param readable - The readable object.
   *
   * @returns A promise containing the array of quads.
   */
  public async parseQuads(readable: Readable): Promise<Quad[]> {
    return await arrayifyStream(pipeStreamsAndErrors(readable, new StreamParser({ format: TEXT_TURTLE })));
  }
}
