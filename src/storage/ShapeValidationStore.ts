import { DataFactory } from 'n3';
import type { Term } from 'rdf-js';
import type { AuxiliaryStrategy } from '../http/auxiliary/AuxiliaryStrategy';
import type { Patch } from '../http/representation/Patch';
import type { Representation } from '../http/representation/Representation';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import { INTERNAL_QUADS } from '../util/ContentTypes';
import { BadRequestHttpError } from '../util/errors/BadRequestHttpError';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import type { IdentifierStrategy } from '../util/identifiers/IdentifierStrategy';
import { isContainerIdentifier } from '../util/PathUtil';
import { cloneRepresentation } from '../util/ResourceUtil';
import { readableToQuads } from '../util/StreamUtil';
import { LDP } from '../util/Vocabularies';
import type { Conditions } from './Conditions';
import type { RepresentationConverter } from './conversion/RepresentationConverter';
import { PassthroughStore } from './PassthroughStore';
import type { ResourceStore } from './ResourceStore';
import type { ShapeValidator } from './validators/ShapeValidator';
import namedNode = DataFactory.namedNode;

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
  private readonly metadataStrategy: AuxiliaryStrategy;
  private readonly converter: RepresentationConverter;
  private readonly validator: ShapeValidator;
  protected readonly logger = getLoggerFor(this);

  public constructor(source: ResourceStore, identifierStrategy: IdentifierStrategy, metadataStrategy: AuxiliaryStrategy,
    converter: RepresentationConverter, validator: ShapeValidator) {
    super(source);
    this.metadataStrategy = metadataStrategy;
    this.identifierStrategy = identifierStrategy;
    this.converter = converter;
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
      // I think this can be removed, right?
      const parentIdentifier = this.identifierStrategy.getParentContainer(identifier);
      const parentContainer = await this.source.getRepresentation(parentIdentifier, {});
      this.logger.debug(`parent container: ${parentContainer.metadata.identifier.value}`);
      throw new NotImplementedHttpError();
    }
    return this.source.modifyResource(identifier, patch, conditions);
  }

  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<ResourceIdentifier[]> {
    if (this.metadataStrategy.isAuxiliaryIdentifier(identifier) &&
        isContainerIdentifier(this.metadataStrategy.getSubjectIdentifier(identifier))) {
      const subjectIdentifier = this.metadataStrategy.getSubjectIdentifier(identifier);
      // Retrieve shapes from new and current representation
      const preferences = { type: { [INTERNAL_QUADS]: 1 }};
      const newRepresentation = await this.converter.handleSafe({
        identifier,
        representation: await cloneRepresentation(representation),
        preferences,
      });
      const dataStore = await readableToQuads(newRepresentation.data);
      const newShapes = dataStore.getObjects(
        namedNode(subjectIdentifier.path), LDP.terms.constrainedBy, null,
      );

      const currentRepresentation = await this.converter.handleSafe({
        identifier,
        representation: await this.source.getRepresentation(identifier, {}),
        preferences,
      });

      dataStore.addQuads((await readableToQuads(currentRepresentation.data)).getQuads(null, null, null, null));
      const shapes = dataStore.getObjects(
        namedNode(subjectIdentifier.path), LDP.terms.constrainedBy, null,
      );
      shapes.forEach((shape: Term): any => this.logger.debug(`${shape.value}`));
      // Verify that only there is at most one shapeConstraint per container
      // https://github.com/CommunitySolidServer/CommunitySolidServer/issues/942#issuecomment-1143789703
      if (shapes.length > 1) {
        throw new BadRequestHttpError('A container can only be constrained by at most one shape resource.');
      }
      // Verify that no (non-auxiliary) resources are available in the container (children = 0)
      // https://github.com/CommunitySolidServer/CommunitySolidServer/issues/942#issuecomment-1143789703
      if (newShapes.length === 1 &&
          dataStore.getObjects(namedNode(subjectIdentifier.path), LDP.terms.contains, null).length > 0) {
        throw new BadRequestHttpError(
          'A container can only be constrained when there are no resources present in that container.',
        );
      }
      dataStore.getObjects(namedNode(subjectIdentifier.path), LDP.terms.contains, null);
    }

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
