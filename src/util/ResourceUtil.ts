import arrayifyStream from 'arrayify-stream';
import { BasicRepresentation } from '../ldp/representation/BasicRepresentation';
import type { Representation } from '../ldp/representation/Representation';
import { RepresentationMetadata } from '../ldp/representation/RepresentationMetadata';
import { guardedStreamFrom } from './StreamUtil';

import { LDP, RDF } from './Vocabularies';

/**
 * Helper function to generate type quads for a Container or Resource.
 * @param metadata - Metadata to add to.
 * @param isContainer - If the identifier corresponds to a container.
 *
 * @returns The generated quads.
 */
export function addResourceMetadata(metadata: RepresentationMetadata, isContainer: boolean): void {
  if (isContainer) {
    metadata.add(RDF.terms.type, LDP.terms.Container);
    metadata.add(RDF.terms.type, LDP.terms.BasicContainer);
  }
  metadata.add(RDF.terms.type, LDP.terms.Resource);
}

/**
 * Helper function to clone a representation, the original representation can still be used.
 * This function loads the entire stream in memory.
 * @param representation - The representation to clone.
 *
 * @returns The cloned representation.
 */
export async function cloneRepresentation(representation: Representation): Promise<BasicRepresentation> {
  const data = await arrayifyStream(representation.data);
  const result = new BasicRepresentation(
    data,
    new RepresentationMetadata(representation.metadata),
    representation.binary,
  );
  representation.data = guardedStreamFrom(data);
  return result;
}
