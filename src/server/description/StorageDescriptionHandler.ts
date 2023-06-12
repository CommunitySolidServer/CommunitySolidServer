import { OkResponseDescription } from '../../http/output/response/OkResponseDescription';
import type { ResponseDescription } from '../../http/output/response/ResponseDescription';
import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
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
 * The input path needs to match the relative path used to generate storage description resources
 * and will be used to verify if the container it is linked to is an actual storage.
 */
export class StorageDescriptionHandler extends OperationHttpHandler {
  private readonly store: ResourceStore;
  private readonly path: string;
  private readonly describer: StorageDescriber;

  public constructor(store: ResourceStore, path: string, describer: StorageDescriber) {
    super();
    this.store = store;
    this.path = path;
    this.describer = describer;
  }

  public async canHandle({ operation: { target, method }}: OperationHttpHandlerInput): Promise<void> {
    if (method !== 'GET') {
      throw new MethodNotAllowedHttpError([ method ], `Only GET requests can target the storage description.`);
    }
    const container = this.getStorageIdentifier(target);
    const representation = await this.store.getRepresentation(container, {});
    representation.data.destroy();
    if (!representation.metadata.has(RDF.terms.type, PIM.terms.Storage)) {
      throw new NotImplementedHttpError(`Only supports descriptions of storage containers.`);
    }

    await this.describer.canHandle(target);
  }

  public async handle({ operation: { target }}: OperationHttpHandlerInput): Promise<ResponseDescription> {
    const quads = await this.describer.handle(this.getStorageIdentifier(target));

    const representation = new BasicRepresentation(quads, INTERNAL_QUADS);

    return new OkResponseDescription(representation.metadata, representation.data);
  }

  /**
   * Determine the identifier of the root storage based on the identifier of the root storage description resource.
   */
  protected getStorageIdentifier(descriptionIdentifier: ResourceIdentifier): ResourceIdentifier {
    return { path: ensureTrailingSlash(descriptionIdentifier.path.slice(0, -this.path.length)) };
  }
}
