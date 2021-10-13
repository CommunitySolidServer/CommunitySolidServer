import SHACLValidator from 'rdf-validate-shacl';
import type { Patch } from '../http/representation/Patch';
import type { Representation } from '../http/representation/Representation';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import { fetchDataset } from '../util/FetchUtil';
import type { IdentifierStrategy } from '../util/identifiers/IdentifierStrategy';
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

    const dataStore = await readableToQuads(representation.data);

    if (typeof shapeURL === 'string') {
      // eslint-disable-next-line unicorn/expiring-todo-comments
      // TODO: bekijk hoe gevalidate moet worden + later alle logger info naar debug brengen
      this.logger.info(`URL of the shapefile present in the metadata of the parent: ${shapeURL}`);

      const shape = await fetchDataset(shapeURL, this.converter);
      const shapeStore = await readableToQuads(shape.data);

      //
      // // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      // shapeStore.getQuads(null, null, null, null).forEach(quad => {
      // this.logger.info(`${quad.subject.value} ${quad.predicate.value} ${quad.object.value}`);
      // });
      //

      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      dataStore.getQuads(null, null, null, null).forEach(quad => {
        this.logger.info(`${quad.subject.value} ${quad.predicate.value} ${quad.object.value}`);
      });

      const validator = new SHACLValidator(shapeStore);
      const report = validator.validate(dataStore);
      this.logger.info(`Validation of the data: ${report.conforms ? 'success' : 'failure'}`);
    }

    return super.addResource(identifier, representation, conditions);
  }

  public async modifyResource(identifier: ResourceIdentifier, patch: Patch,
    conditions?: Conditions): Promise<ResourceIdentifier[]> {
    // Check if the parent has ldp:constrainedBy in the metadata
    if (!this.identifierStrategy.isRootContainer(identifier)) {
      const parentIdentifier = this.identifierStrategy.getParentContainer(identifier);
      const parentContainer = await this.source.getRepresentation(parentIdentifier, {});
      // eslint-disable-next-line no-console
      console.log(parentContainer.metadata);
      throw new NotImplementedHttpError();
    }
    return super.modifyResource(identifier, patch, conditions);
  }

  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<ResourceIdentifier[]> {
    return super.setRepresentation(identifier, representation, conditions);
  }
}
