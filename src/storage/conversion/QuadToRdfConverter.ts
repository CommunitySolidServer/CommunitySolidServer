import type { Readable } from 'stream';
import { StreamWriter } from 'n3';
import rdfSerializer from 'rdf-serialize';
import { BasicRepresentation } from '../../ldp/representation/BasicRepresentation';
import type { Representation } from '../../ldp/representation/Representation';
import type { ValuePreferences } from '../../ldp/representation/RepresentationPreferences';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { pipeSafely } from '../../util/StreamUtil';
import { PREFERRED_PREFIX_TERM } from '../../util/Vocabularies';
import { getConversionTarget } from './ConversionUtil';
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

  public async handle({ identifier, representation: quads, preferences }: RepresentationConverterArgs):
  Promise<Representation> {
    // Can not be undefined if the `canHandle` call passed
    const contentType = getConversionTarget(await this.getOutputTypes(), preferences.type)!;
    let data: Readable;

    // Use prefixes if possible (see https://github.com/rubensworks/rdf-serialize.js/issues/1)
    if (/(?:turtle|trig)$/u.test(contentType)) {
      const prefixes = Object.fromEntries(quads.metadata.quads(null, PREFERRED_PREFIX_TERM, null)
        .map(({ subject, object }): [string, string] => [ object.value, subject.value ]));
      const options = { format: contentType, baseIRI: identifier.path, prefixes };
      data = pipeSafely(quads.data, new StreamWriter(options));
    // Otherwise, write without prefixes
    } else {
      data = rdfSerializer.serialize(quads.data, { contentType }) as Readable;
    }

    return new BasicRepresentation(data, quads.metadata, contentType);
  }
}
