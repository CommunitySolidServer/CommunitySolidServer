import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'n3';
import { BasicRepresentation } from '../http/representation/BasicRepresentation';
import type { Representation } from '../http/representation/Representation';
import { RepresentationMetadata } from '../http/representation/RepresentationMetadata';
import type { Conditions } from '../storage/conditions/Conditions';
import type { ETagHandler } from '../storage/conditions/ETagHandler';
import { NotModifiedHttpError } from './errors/NotModifiedHttpError';
import { guardedStreamFrom } from './StreamUtil';
import { toLiteral } from './TermUtil';
import { CONTENT_TYPE_TERM, DC, HH, LDP, RDF, SOLID_META, XSD } from './Vocabularies';
import namedNode = DataFactory.namedNode;

/**
 * Helper function to generate type quads for a Container or Resource.
 *
 * @param metadata - Metadata to add to.
 * @param isContainer - If the identifier corresponds to a container.
 */
export function addResourceMetadata(metadata: RepresentationMetadata, isContainer: boolean): void {
  if (isContainer) {
    metadata.add(RDF.terms.type, LDP.terms.Container);
    metadata.add(RDF.terms.type, LDP.terms.BasicContainer);
  }
  metadata.add(RDF.terms.type, LDP.terms.Resource);
}

/**
 * Updates the dc:modified time to the given time.
 *
 * @param metadata - Metadata to update.
 * @param date - Last modified date. Defaults to current time.
 */
export function updateModifiedDate(metadata: RepresentationMetadata, date = new Date()): void {
  // Milliseconds get lost in some serializations, potentially causing mismatches
  const lastModified = new Date(date);
  lastModified.setMilliseconds(0);
  metadata.set(DC.terms.modified, toLiteral(lastModified.toISOString(), XSD.terms.dateTime));
}

/**
 * Links a template file with a given content-type to the metadata using the SOLID_META.template predicate.
 *
 * @param metadata - Metadata to update.
 * @param templateFile - Path to the template.
 * @param contentType - Content-type of the template after it is rendered.
 */
export function addTemplateMetadata(metadata: RepresentationMetadata, templateFile: string, contentType: string):
void {
  const templateNode = namedNode(templateFile);
  metadata.add(SOLID_META.terms.template, templateNode);
  metadata.addQuad(templateNode, CONTENT_TYPE_TERM, contentType);
}

/**
 * Helper function to clone a representation, the original representation can still be used.
 * This function loads the entire stream in memory.
 *
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

/**
 * Verify whether the given {@link Representation} matches the given conditions.
 * If true, add the corresponding ETag to the body metadata.
 * If not, destroy the data stream and throw a {@link NotModifiedHttpError} with the same ETag.
 * If `conditions` is not defined, nothing will happen.
 *
 * This uses the strict conditions check which takes the content type into account;
 * therefore, this should only be called after content negotiation, when it is certain what the output will be.
 *
 * Note that browsers only keep track of one ETag, and the Vary header has no impact on this,
 * meaning the browser could send us the ETag for a Turtle resource even though it is requesting JSON-LD;
 * this is why we have to check ETags after content negotiation.
 *
 * @param body - The representation to compare the conditions against.
 * @param eTagHandler - Used to generate the ETag to return with the 304 response.
 * @param conditions - The conditions to assert.
 */
export function assertReadConditions(body: Representation, eTagHandler: ETagHandler, conditions?: Conditions): void {
  const eTag = eTagHandler.getETag(body.metadata);
  if (conditions && !conditions.matchesMetadata(body.metadata, true)) {
    body.data.destroy();
    throw new NotModifiedHttpError(eTag);
  }
  body.metadata.set(HH.terms.etag, eTag);
}
