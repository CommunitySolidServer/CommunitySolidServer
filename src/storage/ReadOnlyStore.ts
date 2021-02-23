import type { Patch } from '../ldp/http/Patch';
import type { Representation } from '../ldp/representation/Representation';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { ForbiddenHttpError } from '../util/errors/ForbiddenHttpError';
import type { Conditions } from './Conditions';
import { PassthroughStore } from './PassthroughStore';
import type { ResourceStore } from './ResourceStore';

/**
 * Store that only allow read operations on the underlying source.
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
export class ReadOnlyStore<T extends ResourceStore = ResourceStore> extends PassthroughStore<T> {
  public constructor(source: T) {
    super(source);
  }

  public async addResource(container: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<ResourceIdentifier> {
    throw new ForbiddenHttpError();
  }

  public async deleteResource(identifier: ResourceIdentifier, conditions?: Conditions): Promise<void> {
    throw new ForbiddenHttpError();
  }

  public async modifyResource(identifier: ResourceIdentifier, patch: Patch, conditions?: Conditions):
  Promise<ResourceIdentifier[]> {
    throw new ForbiddenHttpError();
  }

  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<ResourceIdentifier[]> {
    throw new ForbiddenHttpError();
  }
}
