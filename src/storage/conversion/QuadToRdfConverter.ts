import type { Readable } from 'stream';
import rdfSerializer from 'rdf-serialize';
import type { Representation } from '../../ldp/representation/Representation';
import { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type {
  ValuePreferences,
  RepresentationPreferences,
} from '../../ldp/representation/RepresentationPreferences';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { guardStream } from '../../util/GuardedStream';
import { CONTENT_TYPE } from '../../util/Vocabularies';
import { matchingMediaTypes } from './ConversionUtil';
import type { RepresentationConverterArgs } from './RepresentationConverter';
import { TypedRepresentationConverter } from './TypedRepresentationConverter';

/**
 * Converts `internal/quads` to most major RDF serializations.
 */
export class QuadToRdfConverter extends TypedRepresentationConverter {
  public async getInputTypes(): Promise<ValuePreferences> {
    return { [INTERNAL_QUADS]: 1 };
  }

  public async getOutputTypes(): Promise<ValuePreferences> {
    return rdfSerializer.getContentTypesPrioritized();
  }

  public async handle(input: RepresentationConverterArgs): Promise<Representation> {
    return this.quadsToRdf(input.representation, input.preferences);
  }

  private async quadsToRdf(quads: Representation, { type }: RepresentationPreferences): Promise<Representation> {
    const contentType = matchingMediaTypes(type, await this.getOutputTypes())[0];
    const metadata = new RepresentationMetadata(quads.metadata, { [CONTENT_TYPE]: contentType });
    return {
      binary: true,
      data: guardStream(rdfSerializer.serialize(quads.data, { contentType }) as Readable),
      metadata,
    };
  }
}
