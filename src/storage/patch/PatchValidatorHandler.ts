import { Store } from 'n3';
import { getLoggerFor } from '../../logging/LogUtil';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { PatchValidator } from './PatchValidator';
import type { RdfStorePatcherInput } from './RdfStorePatcher';
import { RdfStorePatcher } from './RdfStorePatcher';

export class PatchValidatorHandler extends RdfStorePatcher {
  protected readonly logger = getLoggerFor(this);

  private readonly patcher: RdfStorePatcher;
  private readonly validator: PatchValidator;

  public constructor(patcher: RdfStorePatcher, validator: PatchValidator) {
    super();
    this.patcher = patcher;
    this.validator = validator;
  }

  public async handle(input: RdfStorePatcherInput): Promise<Store> {
    const { store, identifier } = input;
    const inputStore = new Store(store.getQuads(null, null, null, null));
    const patchedStore = await this.patcher.handle(input);

    // Will use ImmutableMetadataValidator (based on ImmutableMetadataPatcher) and ShapeConstraintsValidator to
    // verify whether the patch can be executed or should fail
    //
    // ShapeConstraintsValidator will check the following:
    // * verify that only there is at most one shapeConstraint per container
    // * verify that no resources are available in the container (children = 0)
    // Note: config must be configured
    try {
      await this.validator.handle({ identifier, inputStore, patchedStore });
    } catch (error: unknown) {
      if (!NotImplementedHttpError.isInstance(error)) {
        throw error;
      }
      // Note: make this debug later
      this.logger.info('No validators had to be executed, so it is fine.');
    }

    return patchedStore;
  }
}
