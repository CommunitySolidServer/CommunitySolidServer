import { Conditions } from './Conditions';
import { PassthroughStore } from './PassthroughStore';
import { Patch } from '../ldp/http/Patch';
import { PatchHandler } from './patch/PatchHandler';
import { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { ResourceStore } from './ResourceStore';

/**
 * {@link ResourceStore} using decorator pattern for the `modifyResource` function.
 * If the original store supports the {@link Patch}, behaviour will be identical,
 * otherwise one of the {@link PatchHandler}s supporting the given Patch will be called instead.
 */
export class PatchingStore extends PassthroughStore {
  private readonly patcher: PatchHandler;

  public constructor(source: ResourceStore, patcher: PatchHandler) {
    super(source);
    this.patcher = patcher;
  }

  public async modifyResource(identifier: ResourceIdentifier, patch: Patch, conditions?: Conditions): Promise<void> {
    try {
      return await this.source.modifyResource(identifier, patch, conditions);
    } catch (error) {
      return this.patcher.handleSafe({ identifier, patch });
    }
  }
}
