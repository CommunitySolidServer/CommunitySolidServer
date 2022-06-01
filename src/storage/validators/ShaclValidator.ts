import type { Store } from 'n3';
import SHACLValidator from 'rdf-validate-shacl';
import type { AuxiliaryStrategy } from '../../http/auxiliary/AuxiliaryStrategy';
import { getLoggerFor } from '../../logging/LogUtil';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { fetchDataset } from '../../util/FetchUtil';
import { cloneRepresentation } from '../../util/ResourceUtil';
import { readableToQuads } from '../../util/StreamUtil';
import { LDP, SH } from '../../util/Vocabularies';
import type { RepresentationConverter } from '../conversion/RepresentationConverter';
import type { ShapeValidatorInput } from './ShapeValidator';
import { ShapeValidator } from './ShapeValidator';

/**
 * Validates a Representation against SHACL shapes using an external SHACL validator.
 */
export class ShaclValidator extends ShapeValidator {
  private readonly converter: RepresentationConverter;
  protected readonly logger = getLoggerFor(this);
  private readonly noShapePresent = 'No ldp:constrainedBy predicate.';
  private readonly auxiliaryStrategy: AuxiliaryStrategy;

  public constructor(converter: RepresentationConverter, auxiliaryStrategy: AuxiliaryStrategy) {
    super();
    this.converter = converter;
    this.auxiliaryStrategy = auxiliaryStrategy;
  }

  public async canHandle({ parentRepresentation }: ShapeValidatorInput): Promise<void> {
    const shapeURL = parentRepresentation.metadata.get(LDP.terms.constrainedBy)?.value;
    if (!shapeURL) {
      throw new Error(this.noShapePresent);
    }
  }

  public async handle(input: ShapeValidatorInput): Promise<void> {
    const { parentRepresentation, representation } = input;
    // Check if the parent has ldp:constrainedBy in the metadata
    const shapeURL = parentRepresentation.metadata.get(LDP.terms.constrainedBy)!.value;
    let representationData;
    // Convert the RDF representation to a N3.Store
    const preferences = { type: { [INTERNAL_QUADS]: 1 }};
    try {
      // Creating a new representation as the data might be written later by DataAccessorBasedStore
      const tempRepresentation = await cloneRepresentation(representation);
      this.logger.info(`own: ${representation.metadata.identifier.value}`);
      representationData = await this.converter.handleSafe({
        identifier: { path: representation.metadata.identifier.value },
        representation: tempRepresentation,
        preferences,
      });
    } catch (error: unknown) {
      representation.data.destroy();
      throw error;
    }
    const dataStore = await readableToQuads(representationData.data);

    if (this.auxiliaryStrategy.isAuxiliaryIdentifier({ path: representation.metadata.identifier.value })) {
      this.logger.debug('It is an auxiliary file, no validation is required here.');
      return;
    }

    this.logger.debug(`URL of the shapefile present in the metadata of the parent: ${shapeURL}`);
    const shape = await fetchDataset(shapeURL);
    const shapeStore = await readableToQuads(shape.data);
    this.targetClassCheck(shapeStore, dataStore, shapeURL);
    // Actual validation
    const validator = new SHACLValidator(shapeStore);
    const report = validator.validate(dataStore);
    this.logger.debug(`Validation of the data: ${report.conforms ? 'success' : 'failure'}`);
    if (!report.conforms) {
      throw new BadRequestHttpError(`Data does not conform to ${shapeURL}`);
    }
  }

  public async handleSafe(input: ShapeValidatorInput): Promise<void> {
    let canHandle: boolean;
    try {
      await this.canHandle(input);
      canHandle = true;
    } catch {
      canHandle = false;
    }
    if (canHandle) {
      await this.handle(input);
    }
  }

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
  private targetClassCheck(shapeStore: Store, dataStore: Store, shapeURL: string): void {
    // Find if any of the sh:targetClass are present
    const targetClasses = shapeStore.getObjects(null, SH.targetClass, null);
    let targetClassesPresent = false;
    for (const targetClass of targetClasses) {
      targetClassesPresent = targetClassesPresent || dataStore.countQuads(null, null, targetClass, null) > 0;
    }
    if (!targetClassesPresent) {
      throw new BadRequestHttpError(`${'Data not accepted as no nodes in the body conform' +
     'to any of the target classes of '}${shapeURL}`);
    }
  }
}
