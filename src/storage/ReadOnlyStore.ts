import type { Patch } from '../http/representation/Patch';
import type { Representation } from '../http/representation/Representation';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import { ForbiddenHttpError } from '../util/errors/ForbiddenHttpError';
import type { Conditions } from './conditions/Conditions';
import { PassthroughStore } from './PassthroughStore';
import type { ChangeMap, ResourceStore } from './ResourceStore';

/**
 * Store that only allow read operations on the underlying source.
 */
/* eslint-disable unused-imports/no-unused-vars */
export class ReadOnlyStore<T extends ResourceStore = ResourceStore> extends PassthroughStore<T> {
  public constructor(source: T) {
    super(source);
  }

  public async addResource(
    container: ResourceIdentifier,
    representation: Representation,
    conditions?: Conditions,
  ): Promise<ChangeMap> {
    throw new ForbiddenHttpError();
  }

  public async deleteResource(identifier: ResourceIdentifier, conditions?: Conditions): Promise<ChangeMap> {
    throw new ForbiddenHttpError();
  }

  public async modifyResource(
    identifier: ResourceIdentifier,
    patch: Patch,
    conditions?: Conditions,
  ): Promise<ChangeMap> {
    throw new ForbiddenHttpError();
  }

  public async setRepresentation(
    identifier: ResourceIdentifier,
    representation: Representation,
    conditions?: Conditions,
  ): Promise<ChangeMap> {
    throw new ForbiddenHttpError();
  }
}
