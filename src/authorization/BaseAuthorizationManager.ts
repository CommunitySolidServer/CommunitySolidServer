import type { DatasetCore, Quad } from '@rdfjs/types';
import type { AuthorizationManager } from '@solidlab/policy-engine';
import type { AuxiliaryIdentifierStrategy } from '../http/auxiliary/AuxiliaryIdentifierStrategy';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import type { ResourceStore } from '../storage/ResourceStore';
import { INTERNAL_QUADS } from '../util/ContentTypes';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import type { IdentifierStrategy } from '../util/identifiers/IdentifierStrategy';
import { arrayifyStream } from '../util/StreamUtil';

/**
 * An {@link AuthorizationManager} that gets parent identifiers from an {@link IdentifierStrategy}
 * and authorization data by using an {@link AuxiliaryIdentifierStrategy} and a {@link ResourceStore}.
 */
export class BaseAuthorizationManager implements AuthorizationManager {
  protected readonly identifierStrategy: IdentifierStrategy;
  protected readonly authStrategy: AuxiliaryIdentifierStrategy;
  protected readonly store: ResourceStore;

  public constructor(
    identifierStrategy: IdentifierStrategy,
    authStrategy: AuxiliaryIdentifierStrategy,
    store: ResourceStore,
  ) {
    this.identifierStrategy = identifierStrategy;
    this.authStrategy = authStrategy;
    this.store = store;
  }

  public getParent(id: string): string | undefined {
    const identifier: ResourceIdentifier = { path: id };
    if (this.identifierStrategy.isRootContainer(identifier)) {
      return;
    }
    return this.identifierStrategy.getParentContainer(identifier).path;
  }

  public async getAuthorizationData(id: string): Promise<DatasetCore | Quad[] | undefined> {
    try {
      const identifier = this.authStrategy.getAuxiliaryIdentifier({ path: id });
      const representation = await this.store.getRepresentation(identifier, { type: { [INTERNAL_QUADS]: 1 }});
      return await arrayifyStream(representation.data);
    } catch (err) {
      if (NotFoundHttpError.isInstance(err)) {
        return;
      }
      throw err;
    }
  }
}
