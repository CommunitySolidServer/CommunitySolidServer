import { PassThrough } from 'node:stream';
import { KeysRdfParseJsonLd } from '@comunica/context-entries';
import type { NamedNode } from '@rdfjs/types';
import rdfParser from 'rdf-parse';
import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import { APPLICATION_JSON, INTERNAL_QUADS } from '../../util/ContentTypes';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { pipeSafely } from '../../util/StreamUtil';
import { PREFERRED_PREFIX_TERM, SOLID_META } from '../../util/Vocabularies';
import { BaseTypedRepresentationConverter } from './BaseTypedRepresentationConverter';
import { ContextDocumentLoader } from './ConversionUtil';
import type { RepresentationConverterArgs } from './RepresentationConverter';

/**
 * Converts most major RDF serializations to `internal/quads`.
 *
 * Custom contexts can be defined to be used when parsing JSON-LD.
 * The keys of the object should be the URL of the context,
 * and the values the file path of the contexts to use when the JSON-LD parser would fetch the given context.
 * We use filepaths because embedding them directly into the configurations breaks Components.js.
 */
export class RdfToQuadConverter extends BaseTypedRepresentationConverter {
  private readonly documentLoader: ContextDocumentLoader;

  public constructor(contexts: Record<string, string> = {}) {
    const inputTypes = rdfParser.getContentTypesPrioritized()
      // ContentType application/json MAY NOT be converted to Quad.
      .then((types): Record<string, number> => {
        delete types[APPLICATION_JSON];
        return types;
      });
    super(inputTypes, INTERNAL_QUADS);
    this.documentLoader = new ContextDocumentLoader(contexts);
  }

  public async handle({ representation, identifier }: RepresentationConverterArgs): Promise<Representation> {
    const newMetadata = new RepresentationMetadata(representation.metadata, INTERNAL_QUADS);
    const rawQuads = rdfParser.parse(representation.data, {
      contentType: representation.metadata.contentType!,
      baseIRI: identifier.path,
      [KeysRdfParseJsonLd.documentLoader.name]: this.documentLoader,
    })
      // This works only for those cases where the data stream has been completely read before accessing the metadata.
      // Eg. the PATCH operation, which is the main case why we store the prefixes in metadata here if there are any.
      // See also https://github.com/CommunitySolidServer/CommunitySolidServer/issues/126
      .on('prefix', (prefix: string, iri: NamedNode): void => {
        newMetadata.addQuad(iri.value, PREFERRED_PREFIX_TERM, prefix, SOLID_META.terms.ResponseMetadata);
      });

    const pass = new PassThrough({ objectMode: true });
    const data = pipeSafely(rawQuads, pass, (error): Error => new BadRequestHttpError(error.message));

    return new BasicRepresentation(data, newMetadata);
  }
}
