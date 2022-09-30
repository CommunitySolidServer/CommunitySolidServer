import { OkResponseDescription } from '../../http/output/response/OkResponseDescription';
import type { ResponseDescription } from '../../http/output/response/ResponseDescription';
import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { RepresentationConverter } from '../../storage/conversion/RepresentationConverter';
import type { ResourceStore } from '../../storage/ResourceStore';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { MethodNotAllowedHttpError } from '../../util/errors/MethodNotAllowedHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { ensureTrailingSlash } from '../../util/PathUtil';
import { PIM, RDF } from '../../util/Vocabularies';
import type { OperationHttpHandlerInput } from '../OperationHttpHandler';
import { OperationHttpHandler } from '../OperationHttpHandler';
import type { StorageDescriber } from './StorageDescriber';

/**
 * Generates the response for GET requests targeting a storage description resource.
 * The suffix needs to match the suffix used to generate storage description resources
 * and will be used to verify the container it is linked to is an actual storage.
 */
export class StorageDescriptionHandler extends OperationHttpHandler {
  private readonly store: ResourceStore;
  private readonly suffix: string;
  private readonly converter: RepresentationConverter;
  private readonly describer: StorageDescriber;

  public constructor(store: ResourceStore, suffix: string, converter: RepresentationConverter,
    describer: StorageDescriber) {
    super();
    this.store = store;
    this.suffix = suffix;
    this.converter = converter;
    this.describer = describer;
  }

  public async canHandle({ operation: { target, method }}: OperationHttpHandlerInput): Promise<void> {
    if (method !== 'GET') {
      throw new MethodNotAllowedHttpError([ method ], `Only GET requests can target the storage description.`);
    }
    const container = { path: ensureTrailingSlash(target.path.slice(0, -this.suffix.length)) };
    const representation = await this.store.getRepresentation(container, {});
    representation.data.destroy();
    if (!representation.metadata.has(RDF.terms.type, PIM.terms.Storage)) {
      throw new NotImplementedHttpError(`Only supports descriptions of storage containers.`);
    }

    await this.describer.canHandle(target);
  }

  public async handle({ operation: { target, preferences }}: OperationHttpHandlerInput): Promise<ResponseDescription> {
    const quads = await this.describer.handle(target);

    const representation = new BasicRepresentation(quads, INTERNAL_QUADS);

    const converted = await this.converter.handleSafe({ identifier: target, representation, preferences });

    return new OkResponseDescription(converted.metadata, converted.data);
  }
}
