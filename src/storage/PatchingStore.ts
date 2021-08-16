import type { Patch } from '../ldp/http/Patch';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import type { Conditions } from './Conditions';
import { PassthroughStore } from './PassthroughStore';
import type { PatchHandler } from './patch/PatchHandler';
import type { ResourceStore } from './ResourceStore';

/**
 * {@link ResourceStore} using decorator pattern for the `modifyResource` function.
 * If the original store supports the {@link Patch}, behaviour will be identical,
 * otherwise the {@link PatchHandler} will be called instead.
 */
export class PatchingStore<T extends ResourceStore = ResourceStore> extends PassthroughStore<T> {
  private readonly patcher: PatchHandler;

  public constructor(source: T, patcher: PatchHandler) {
    super(source);
    this.patcher = patcher;
  }

  public async modifyResource(identifier: ResourceIdentifier, patch: Patch,
    conditions?: Conditions): Promise<ResourceIdentifier[]> {
    try {
      return await this.source.modifyResource(identifier, patch, conditions);
    } catch (error: unknown) {
      if (NotImplementedHttpError.isInstance(error)) {
        return this.patcher.handleSafe({ source: this.source, identifier, patch });
      }
      throw error;
    }
  }
}
