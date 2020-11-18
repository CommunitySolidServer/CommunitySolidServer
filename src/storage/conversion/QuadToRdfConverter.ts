import type { Readable } from 'stream';
import rdfSerializer from 'rdf-serialize';
import type { Representation } from '../../ldp/representation/Representation';
import { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type { RepresentationPreferences } from '../../ldp/representation/RepresentationPreferences';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { CONTENT_TYPE } from '../../util/UriConstants';
import { validateRequestArgs, matchingTypes } from './ConversionUtil';
import type { RepresentationConverterArgs } from './RepresentationConverter';
import { TypedRepresentationConverter } from './TypedRepresentationConverter';

/**
 * Converts `internal/quads` to most major RDF serializations.
 */
export class QuadToRdfConverter extends TypedRepresentationConverter {
  public async getInputTypes(): Promise<Record<string, number>> {
    return { [INTERNAL_QUADS]: 1 };
  }

  public async getOutputTypes(): Promise<Record<string, number>> {
    return rdfSerializer.getContentTypesPrioritized();
  }

  public async canHandle(input: RepresentationConverterArgs): Promise<void> {
    validateRequestArgs(input, [ INTERNAL_QUADS ], await rdfSerializer.getContentTypes());
  }

  public async handle(input: RepresentationConverterArgs): Promise<Representation> {
    return this.quadsToRdf(input.representation, input.preferences);
  }

  private async quadsToRdf(quads: Representation, preferences: RepresentationPreferences): Promise<Representation> {
    const contentType = matchingTypes(preferences, await rdfSerializer.getContentTypes())[0].value;
    const metadata = new RepresentationMetadata(quads.metadata, { [CONTENT_TYPE]: contentType });
    return {
      binary: true,
      data: rdfSerializer.serialize(quads.data, { contentType }) as Readable,
      metadata,
    };
  }
}
