import type { Patch } from '../http/representation/Patch';
import type { Representation } from '../http/representation/Representation';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import type { IdentifierStrategy } from '../util/identifiers/IdentifierStrategy';
import type { Conditions } from './Conditions';
import { PassthroughStore } from './PassthroughStore';
import type { ResourceStore } from './ResourceStore';
import type { ShapeValidator } from './validators/ShapeValidator';

/**
 * ResourceStore which validates input data based on shapes using SHACL.
 *
 * When a validation is successful, the input data is written away in the backend.
 * Methods implemented:
 *  * Adding a resource to the backend
 *
 */
export class ShapeValidationStore extends PassthroughStore {
  private readonly identifierStrategy: IdentifierStrategy;
  private readonly validator: ShapeValidator;
  protected readonly logger = getLoggerFor(this);

  public constructor(source: ResourceStore, identifierStrategy: IdentifierStrategy, validator: ShapeValidator) {
    super(source);
    this.identifierStrategy = identifierStrategy;
    this.validator = validator;
  }

  public async addResource(identifier: ResourceIdentifier, representation: Representation, conditions?: Conditions):
  Promise<ResourceIdentifier> {
    const parentRepresentation = await this.source.getRepresentation(identifier, {});

    await this.validator.handleSafe({ parentRepresentation, representation });

    return await this.source.addResource(identifier, representation, conditions);
  }

  public async modifyResource(identifier: ResourceIdentifier, patch: Patch, conditions?: Conditions):
  Promise<ResourceIdentifier[]> {
    // Check if the parent has ldp:constrainedBy in the metadata
    if (!this.identifierStrategy.isRootContainer(identifier)) {
      const parentIdentifier = this.identifierStrategy.getParentContainer(identifier);
      const parentContainer = await this.source.getRepresentation(parentIdentifier, {});
      this.logger.debug(parentContainer.metadata.identifier.value);
      throw new NotImplementedHttpError();
    }
    return this.source.modifyResource(identifier, patch, conditions);
  }

  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<ResourceIdentifier[]> {
    if (!this.identifierStrategy.isRootContainer(identifier)) {
      const parentIdentifier = this.identifierStrategy.getParentContainer(identifier);
      // In case the parent being http://localhost:3123/.internal/setup/ getting the representation would result into a
      // NotFoundHttpError
      try {
        const parentRepresentation = await this.source.getRepresentation(parentIdentifier, {});
        await this.validator.handleSafe({ parentRepresentation,
          representation });
      } catch (error: unknown) {
        if (!NotFoundHttpError.isInstance(error)) {
          throw error;
        }
      }
    }
    return this.source.setRepresentation(identifier, representation, conditions);
  }
}
