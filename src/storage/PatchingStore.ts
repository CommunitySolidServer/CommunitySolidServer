import type { Patch } from '../http/representation/Patch';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import type { Conditions } from './conditions/Conditions';
import { PassthroughStore } from './PassthroughStore';
import type { PatchHandler } from './patch/PatchHandler';
import type { ChangeMap, ResourceStore } from './ResourceStore';

/**
 * {@link ResourceStore} using decorator pattern for the `modifyResource` function.
 * If the original store supports the {@link Patch}, behaviour will be identical,
 * otherwise the {@link PatchHandler} will be called instead.
 */
export class PatchingStore<T extends ResourceStore = ResourceStore> extends PassthroughStore<T> {
  private readonly patchHandler: PatchHandler;

  public constructor(source: T, patchHandler: PatchHandler) {
    super(source);
    this.patchHandler = patchHandler;
  }

  public async modifyResource(
    identifier: ResourceIdentifier,
    patch: Patch,
    conditions?: Conditions,
  ): Promise<ChangeMap> {
    try {
      return await this.source.modifyResource(identifier, patch, conditions);
    } catch (error: unknown) {
      if (NotImplementedHttpError.isInstance(error)) {
        return this.patchHandler.handleSafe({ source: this.source, identifier, patch });
      }
      throw error;
    }
  }
}
