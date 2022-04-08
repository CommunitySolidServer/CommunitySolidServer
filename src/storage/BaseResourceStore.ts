import type { Patch } from '../http/representation/Patch';
import type { Representation } from '../http/representation/Representation';
import type { RepresentationPreferences } from '../http/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import type { Conditions } from './Conditions';
import type { ResourceStore } from './ResourceStore';

/**
 * Base implementation of ResourceStore for implementers of custom stores.
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
export class BaseResourceStore implements ResourceStore {
  public async hasResource(identifier: ResourceIdentifier): Promise<boolean> {
    throw new NotImplementedHttpError();
  }

  public async getRepresentation(identifier: ResourceIdentifier, preferences: RepresentationPreferences,
    conditions?: Conditions): Promise<Representation> {
    throw new NotImplementedHttpError();
  }

  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<ResourceIdentifier[]> {
    throw new NotImplementedHttpError();
  }

  public async addResource(container: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<ResourceIdentifier> {
    throw new NotImplementedHttpError();
  }

  public async deleteResource(identifier: ResourceIdentifier,
    conditions?: Conditions): Promise<ResourceIdentifier[]> {
    throw new NotImplementedHttpError();
  }

  public async modifyResource(identifier: ResourceIdentifier, patch: Patch,
    conditions?: Conditions): Promise<ResourceIdentifier[]> {
    throw new NotImplementedHttpError();
  }
}
