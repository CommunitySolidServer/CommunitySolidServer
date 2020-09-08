import { Stats } from 'fs';
import { Readable } from 'stream';
import arrayifyStream from 'arrayify-stream';
import { DataFactory, StreamParser, StreamWriter } from 'n3';
import type { NamedNode, Quad } from 'rdf-js';
import streamifyArray from 'streamify-array';
import { TEXT_TURTLE } from '../util/ContentTypes';
import { LDP, RDF, STAT, TERMS, XML } from './Prefixes';
import { pipeStreamsAndErrors } from './Util';

export const TYPE_PREDICATE = DataFactory.namedNode(`${RDF}type`);
export const MODIFIED_PREDICATE = DataFactory.namedNode(`${TERMS}modified`);
export const CONTAINS_PREDICATE = DataFactory.namedNode(`${LDP}contains`);
export const MTIME_PREDICATE = DataFactory.namedNode(`${STAT}mtime`);
export const SIZE_PREDICATE = DataFactory.namedNode(`${STAT}size`);

export const CONTAINER_OBJECT = DataFactory.namedNode(`${LDP}Container`);
export const BASIC_CONTAINER_OBJECT = DataFactory.namedNode(`${LDP}BasicContainer`);
export const RESOURCE_OBJECT = DataFactory.namedNode(`${LDP}Resource`);
export const DATETIME_OBJECT = DataFactory.namedNode(`${XML}dateTime`);

export class MetadataController {
  /**
   * Helper function to generate quads for a Container or Resource.
   * @param URI - The URI for which the quads should be generated.
   * @param stats - The Stats of the subject.
   *
   * @returns The generated quads.
   */
  public generateResourceQuads(URI: string, stats: Stats): Quad[] {
    const subject: NamedNode = DataFactory.namedNode(URI);
    const quads: Quad[] = [];

    if (stats.isDirectory()) {
      quads.push(DataFactory.quad(subject, TYPE_PREDICATE, CONTAINER_OBJECT));
      quads.push(DataFactory.quad(subject, TYPE_PREDICATE, BASIC_CONTAINER_OBJECT));
    }
    quads.push(DataFactory.quad(subject, TYPE_PREDICATE, RESOURCE_OBJECT));
    quads.push(DataFactory.quad(subject, SIZE_PREDICATE, DataFactory.literal(stats.size)));
    quads.push(DataFactory.quad(
      subject,
      MODIFIED_PREDICATE,
      DataFactory.literal(stats.mtime.toUTCString(), DATETIME_OBJECT),
    ));
    quads.push(DataFactory.quad(
      subject,
      MTIME_PREDICATE,
      DataFactory.literal(stats.mtime.getTime() / 100),
    ));

    return quads;
  }

  /**
   * Helper function to generate the quad describing that the resource URI is a child of the container URI.
   * @param containerURI - The URI of the container.
   * @param childURI - The URI of the child resource.
   *
   * @returns The generated quad.
   */
  public generateContainerContainsResourceQuad(containerURI: string, childURI: string): Quad {
    return DataFactory.quad(DataFactory.namedNode(containerURI), CONTAINS_PREDICATE, DataFactory.namedNode(
      childURI,
    ));
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
