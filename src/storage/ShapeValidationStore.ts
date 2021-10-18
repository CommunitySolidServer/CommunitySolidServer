import type { Quad, Store } from 'n3';
import SHACLValidator from 'rdf-validate-shacl';
import type { Patch } from '../http/representation/Patch';
import type { Representation } from '../http/representation/Representation';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import { INTERNAL_QUADS } from '../util/ContentTypes';
import { BadRequestHttpError } from '../util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import { fetchDataset } from '../util/FetchUtil';
import type { IdentifierStrategy } from '../util/identifiers/IdentifierStrategy';
import { cloneRepresentation } from '../util/ResourceUtil';
import { readableToQuads } from '../util/StreamUtil';
import { LDP, SH } from '../util/Vocabularies';
import type { Conditions } from './Conditions';
import type { RepresentationConverter } from './conversion/RepresentationConverter';
import { PassthroughStore } from './PassthroughStore';
import type { ResourceStore } from './ResourceStore';

/**
 * Verifies that there is at least a triple with a type that corresponds to a target class.
 * Throws an error when that is not present.
 *
 * NOTE: it is possible to validate without targetClass and use one of the other target declarations,
 * but those are used less often.
 *
 * @param shapeStore - The N3.Store containing the shapes
 * @param dataStore - The N3.Store containing the data to be posted
 * @param shapeURL - The URL of where the shape is posted
 */
function targetClassCheck(shapeStore: Store<Quad, Quad, Quad, Quad>,
  dataStore: Store<Quad, Quad, Quad, Quad>,
  shapeURL: string): void {
  // Find if any of the sh:targetClass are present
  const targetClasses = shapeStore.getObjects(null, SH.targetClass, null);

  let targetClassesPresent = false;
  for (const targetClass of targetClasses) {
    targetClassesPresent = targetClassesPresent || dataStore.countQuads(null, null, targetClass, null) > 0;
  }
  if (!targetClassesPresent) {
    throw new BadRequestHttpError(`Data not accepted as no nodes in the body conform to any of the target classes of  ${shapeURL}`);
  }
}

export class ShapeValidationStore<T extends ResourceStore = ResourceStore> extends PassthroughStore<T> {
  private readonly identifierStrategy: IdentifierStrategy;
  private readonly converter: RepresentationConverter;
  protected readonly logger = getLoggerFor(this);

  public constructor(source: T, identifierStrategy: IdentifierStrategy, converter: RepresentationConverter) {
    super(source);
    this.identifierStrategy = identifierStrategy;
    this.converter = converter;
  }

  public async addResource(identifier: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<ResourceIdentifier> {
    // Check if the parent has ldp:constrainedBy in the metadata
    const parentContainer = await this.source.getRepresentation(identifier, {});
    const shapeURL = parentContainer.metadata.get(LDP.constrainedBy)?.value;
    let representationData;

    // Convert the RDF representation to a N3.Store
    const preferences = { type: { [INTERNAL_QUADS]: 1 }};
    try {
      // Creating a new representation as the data might be written later by DataAccessorBasedStore
      const tempRepresentation = await cloneRepresentation(representation);
      representationData = await this.converter.handleSafe({
        identifier,
        representation: tempRepresentation,
        preferences,
      });
    } catch (error: unknown) {
      representation.data.destroy();
      throw error;
    }
    const dataStore = await readableToQuads(representationData.data);

    if (typeof shapeURL === 'string') {
      this.logger.debug(`URL of the shapefile present in the metadata of the parent: ${shapeURL}`);
      const shape = await fetchDataset(shapeURL, this.converter);
      const shapeStore = await readableToQuads(shape.data);

      targetClassCheck(shapeStore, dataStore, shapeURL);

      // Validation of the data
      const validator = new SHACLValidator(shapeStore);
      const report = validator.validate(dataStore);
      this.logger.debug(`Validation of the data: ${report.conforms ? 'success' : 'failure'}`);

      if (!report.conforms) {
        throw new BadRequestHttpError(`Data does not conform to ${shapeURL}`);
      }
    }
    return await this.source.addResource(identifier, representation, conditions);
  }

  public async modifyResource(identifier: ResourceIdentifier, patch: Patch,
    conditions?: Conditions): Promise<ResourceIdentifier[]> {
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
    return this.source.setRepresentation(identifier, representation, conditions);
  }
}
