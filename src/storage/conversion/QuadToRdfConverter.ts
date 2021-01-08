import type { Readable } from 'stream';
import { StreamWriter } from 'n3';
import rdfSerializer from 'rdf-serialize';
import type { Representation } from '../../ldp/representation/Representation';
import { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type { ValuePreferences } from '../../ldp/representation/RepresentationPreferences';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { guardStream } from '../../util/GuardedStream';
import { pipeSafely } from '../../util/StreamUtil';
import { CONTENT_TYPE, PREFERRED_PREFIX_TERM } from '../../util/Vocabularies';
import { matchingMediaTypes } from './ConversionUtil';
import type { RepresentationConverterArgs } from './RepresentationConverter';
import { TypedRepresentationConverter } from './TypedRepresentationConverter';

/**
 * Converts `internal/quads` to most major RDF serializations.
 */
export class QuadToRdfConverter extends TypedRepresentationConverter {
  private readonly outputPreferences?: ValuePreferences;

  public constructor(options: { outputPreferences?: Record<string, number> } = {}) {
    super(
      INTERNAL_QUADS,
      options.outputPreferences ?? rdfSerializer.getContentTypesPrioritized(),
    );
  }

  public async handle({ representation: quads, preferences }: RepresentationConverterArgs): Promise<Representation> {
    const contentType = matchingMediaTypes(preferences.type, await this.getOutputTypes())[0];
    const metadata = new RepresentationMetadata(quads.metadata, { [CONTENT_TYPE]: contentType });
    let data: Readable;

    // Use prefixes if possible (see https://github.com/rubensworks/rdf-serialize.js/issues/1)
    if (/(?:turtle|trig)$/u.test(contentType)) {
      const prefixes = Object.fromEntries(metadata.quads(null, PREFERRED_PREFIX_TERM, null)
        .map(({ subject, object }): [string, string] => [ object.value, subject.value ]));
      data = pipeSafely(quads.data, new StreamWriter({ format: contentType, prefixes }));
    // Otherwise, write without prefixes
    } else {
      data = rdfSerializer.serialize(quads.data, { contentType }) as Readable;
    }
    return {
      binary: true,
      data: guardStream(data),
      metadata,
    };
  }
}
