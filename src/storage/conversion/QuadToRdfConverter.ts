import type { Readable } from 'stream';
import { StreamWriter } from 'n3';
import type { Quad } from 'rdf-js';
import rdfSerializer from 'rdf-serialize';
import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import type { ValuePreferences } from '../../http/representation/RepresentationPreferences';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { pipeSafely, transformSafely } from '../../util/StreamUtil';
import { PREFERRED_PREFIX_TERM, SOLID_META } from '../../util/Vocabularies';
import { BaseTypedRepresentationConverter } from './BaseTypedRepresentationConverter';
import { getConversionTarget } from './ConversionUtil';
import type { RepresentationConverterArgs } from './RepresentationConverter';

/**
 * Converts `internal/quads` to most major RDF serializations.
 */
export class QuadToRdfConverter extends BaseTypedRepresentationConverter {
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
    const contentType = getConversionTarget(await this.getOutputTypes(INTERNAL_QUADS), preferences.type)!;
    let data: Readable;

    // Transform that handles response metadata
    quads.data = transformSafely<Quad>(quads.data, {
      objectMode: true,
      transform(quad: Quad): void {
        if (quad.graph.value === SOLID_META.terms.ResponseMetadata.value) {
          // Console.log(quad.object);
          // this.push(DataFactory.quad(quad.subject, quad.predicate, quad.object));
        } else {
          this.push(quad);
        }
      },
    });

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
