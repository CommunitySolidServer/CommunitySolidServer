import type { Patch } from '../ldp/http/Patch';
import type { Representation } from '../ldp/representation/Representation';
import type { RepresentationPreferences } from '../ldp/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import type { Conditions } from './Conditions';
import type { ResourceStore } from './ResourceStore';

/**
 * Base implementation of ResourceStore for implementers of custom stores.
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
export class BaseResourceStore implements ResourceStore {
  public async addResource(container: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<ResourceIdentifier> {
    throw new NotImplementedHttpError();
  }

  public async deleteResource(identifier: ResourceIdentifier, conditions?: Conditions): Promise<void> {
    throw new NotImplementedHttpError();
  }

  public async getRepresentation(identifier: ResourceIdentifier, preferences: RepresentationPreferences,
    conditions?: Conditions): Promise<Representation> {
    throw new NotImplementedHttpError();
  }

  public async modifyResource(identifier: ResourceIdentifier, patch: Patch, conditions?: Conditions): Promise<void> {
    throw new NotImplementedHttpError();
  }

  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<void> {
    throw new NotImplementedHttpError();
  }

  public async resourceExists(identifier: ResourceIdentifier): Promise<boolean> {
    throw new NotImplementedHttpError();
  }
}
