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
import { LDP } from '../util/Vocabularies';
import type { Conditions } from './Conditions';
import type { RepresentationConverter } from './conversion/RepresentationConverter';
import { PassthroughStore } from './PassthroughStore';
import type { ResourceStore } from './ResourceStore';

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
      // Creating new representation since converter might edit metadata
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
