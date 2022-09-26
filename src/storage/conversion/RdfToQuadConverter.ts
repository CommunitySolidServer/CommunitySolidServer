import { PassThrough } from 'stream';
import { KeysRdfParseJsonLd } from '@comunica/context-entries';
import type { NamedNode } from '@rdfjs/types';
import fetch from 'cross-fetch';
import { readJsonSync } from 'fs-extra';
import { FetchDocumentLoader } from 'jsonld-context-parser';
import type { IJsonLdContext } from 'jsonld-context-parser';
import rdfParser from 'rdf-parse';
import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { resolveAssetPath } from '../../util/PathUtil';
import { pipeSafely } from '../../util/StreamUtil';
import { PREFERRED_PREFIX_TERM, SOLID_META } from '../../util/Vocabularies';
import { BaseTypedRepresentationConverter } from './BaseTypedRepresentationConverter';
import type { RepresentationConverterArgs } from './RepresentationConverter';

/**
 * First checks if a context is stored locally before letting the super class do a fetch.
 */
class ContextDocumentLoader extends FetchDocumentLoader {
  private readonly contexts: Record<string, IJsonLdContext>;

  public constructor(contexts: Record<string, string>) {
    super(fetch);
    this.contexts = {};
    for (const [ key, path ] of Object.entries(contexts)) {
      this.contexts[key] = readJsonSync(resolveAssetPath(path));
    }
  }

  public async load(url: string): Promise<IJsonLdContext> {
    if (url in this.contexts) {
      return this.contexts[url];
    }
    return super.load(url);
  }
}

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
    const inputTypes = rdfParser.getContentTypes()
      // ContentType application/json MAY NOT be converted to Quad.
      .then((types): string[] => types.filter((type): boolean => type !== 'application/json'));
    super(inputTypes, INTERNAL_QUADS);
    this.documentLoader = new ContextDocumentLoader(contexts);
  }

  public async handle({ representation, identifier }: RepresentationConverterArgs): Promise<Representation> {
    const newMetadata = new RepresentationMetadata(representation.metadata, INTERNAL_QUADS);
    const rawQuads = rdfParser.parse(representation.data, {
      contentType: representation.metadata.contentType!,
      baseIRI: identifier.path,
      // All extra keys get passed in the Comunica ActionContext
      // and this is the key that is used to define the document loader.
      // See https://github.com/rubensworks/rdf-parse.js/blob/master/lib/RdfParser.ts
      // and https://github.com/comunica/comunica/blob/master/packages/actor-rdf-parse-jsonld/lib/ActorRdfParseJsonLd.ts
      [KeysRdfParseJsonLd.documentLoader.name]: this.documentLoader,
    } as any)
      // This works only for those cases where the data stream has been completely read before accessing the metadata.
      // Eg. the PATCH operation, which is the main case why we store the prefixes in metadata here if there are any.
      // See also https://github.com/CommunitySolidServer/CommunitySolidServer/issues/126
      .on('prefix', (prefix, iri: NamedNode): void => {
        newMetadata.addQuad(iri.value, PREFERRED_PREFIX_TERM, prefix, SOLID_META.terms.ResponseMetadata);
      });

    const pass = new PassThrough({ objectMode: true });
    const data = pipeSafely(rawQuads, pass, (error): Error => new BadRequestHttpError(error.message));

    return new BasicRepresentation(data, newMetadata);
  }
}
