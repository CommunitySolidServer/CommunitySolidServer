import { DataFactory } from 'n3';
import type { AuxiliaryStrategy } from '../../../../src/http/auxiliary/AuxiliaryStrategy';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import type { RepresentationConverter } from '../../../../src/storage/conversion/RepresentationConverter';
import { ShaclValidator } from '../../../../src/storage/validators/ShaclValidator';
import type { ShapeValidatorInput } from '../../../../src/storage/validators/ShapeValidator';
import { INTERNAL_QUADS } from '../../../../src/util/ContentTypes';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { fetchDataset } from '../../../../src/util/FetchUtil';
import { guardedStreamFrom } from '../../../../src/util/StreamUtil';
import { LDP, RDF, SH } from '../../../../src/util/Vocabularies';
import { SimpleSuffixStrategy } from '../../../util/SimpleSuffixStrategy';
const { namedNode, quad, literal } = DataFactory;

jest.mock('../../../../src/util/FetchUtil', (): any => ({
  fetchDataset: jest.fn<string, any>(),
}));

describe('ShaclValidator', (): void => {
  const root = 'http://example.org/';
  const shapeUrl = `${root}shape`;
  const auxiliarySuffix = '.dummy';
  let shape: Representation;
  let parentRepresentation: Representation;
  let representationToValidate: Representation;
  let converter: RepresentationConverter;
  let validator: ShaclValidator;
  let auxiliaryStrategy: AuxiliaryStrategy;
  let input: ShapeValidatorInput;

  beforeEach((): void => {
    const containerMetadata: RepresentationMetadata = new RepresentationMetadata({ path: root });
    containerMetadata.addQuad(namedNode(root), LDP.terms.constrainedBy, namedNode(shapeUrl));
    parentRepresentation = new BasicRepresentation();
    parentRepresentation.metadata = containerMetadata;
    representationToValidate = new BasicRepresentation(guardedStreamFrom([
      quad(namedNode('http://example.org/a'), RDF.terms.type, namedNode('http://example.org/c')),
      quad(namedNode('http://example.org/a'), namedNode('http://xmlns.com/foaf/0.1/name'), literal('Test')),
    ]), INTERNAL_QUADS);

    const shapeIdentifier: ResourceIdentifier = { path: `${shapeUrl}` };
    shape = new BasicRepresentation(guardedStreamFrom([
      quad(namedNode('http://example.org/exampleshape'), RDF.terms.type, namedNode('http://www.w3.org/ns/shacl#NodeShape')),
      quad(namedNode('http://example.org/exampleshape'), SH.terms.targetClass, namedNode('http://example.org/c')),
      quad(namedNode('http://example.org/exampleshape'), namedNode('http://www.w3.org/ns/shacl#property'), namedNode('http://example.org/property')),
      quad(namedNode('http://example.org/property'), namedNode('http://www.w3.org/ns/shacl#path'), namedNode('http://xmlns.com/foaf/0.1/name')),
      quad(namedNode('http://example.org/property'), namedNode('http://www.w3.org/ns/shacl#minCount'), literal(1)),
      quad(namedNode('http://example.org/property'), namedNode('http://www.w3.org/ns/shacl#maxCount'), literal(1)),
      quad(namedNode('http://example.org/property'), namedNode('http://www.w3.org/ns/shacl#datatype'), namedNode('http://www.w3.org/2001/XMLSchema#string')),
    ]), shapeIdentifier, INTERNAL_QUADS);

    converter = {
      handleSafe: jest.fn((): Promise<Representation> => Promise.resolve(representationToValidate)),
      canHandle: jest.fn(),
      handle: jest.fn(),
    };

    auxiliaryStrategy = new SimpleSuffixStrategy(auxiliarySuffix);
    validator = new ShaclValidator(converter, auxiliaryStrategy);

    input = {
      parentRepresentation,
      representation: representationToValidate,
    };
    (fetchDataset as jest.Mock).mockReturnValue(Promise.resolve(shape));
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it('throws error if the parent container is not constrained by a shape.', async(): Promise<void> => {
    input.parentRepresentation = new BasicRepresentation();
    await expect(validator.canHandle(input)).rejects.toThrow(Error);
  });

  it('fetches the shape and validates the representation.', async(): Promise<void> => {
    await expect(validator.handle(input)).resolves.toBeUndefined();
    expect(converter.handleSafe).toHaveBeenCalledTimes(1);
    expect(fetchDataset).toHaveBeenCalledTimes(1);
    expect(fetchDataset).toHaveBeenLastCalledWith(shapeUrl);
  });

  // // Todo: implement check in shaclvalidator to throw error when not RDF data
  // it('throws error when the representation is not RDF.', async(): Promise<void> => {
  //   input.representation = new BasicRepresentation('text', 'text/plain');
  //   await expect(validator.handle(input)).rejects.toThrow(BadRequestHttpError);
  // });

  it('throws error when the converter fails.', async(): Promise<void> => {
    converter.handleSafe = jest.fn().mockImplementation((): void => {
      throw new BadRequestHttpError('error');
    });
    await expect(validator.handle(input)).rejects.toThrow(BadRequestHttpError);
  });

  it('does not execute validation when the target resource is an auxiliary resource.', async(): Promise<void> => {
    input.representation.metadata.identifier = namedNode(root + auxiliarySuffix);

    await expect(validator.handle(input)).resolves.toBeUndefined();
  });

  it('throws error when the data does not conform to the shape.', async(): Promise<void> => {
    converter.handleSafe = jest.fn((): Promise<Representation> => Promise.resolve(
      new BasicRepresentation(guardedStreamFrom([
        quad(namedNode('http://example.org/a'), RDF.terms.type, namedNode('http://example.org/c')),
        quad(namedNode('http://example.org/a'), namedNode('http://xmlns.com/foaf/0.1/name'), literal(5)),
      ]), INTERNAL_QUADS),
    ));

    await expect(validator.handle(input)).rejects.toThrow(BadRequestHttpError);
    expect(converter.handleSafe).toHaveBeenCalledTimes(1);
    expect(fetchDataset).toHaveBeenCalledTimes(1);
    expect(fetchDataset).toHaveBeenLastCalledWith(shapeUrl);
  });

  it('throws error when no nodes not conform to any of the target classes of the shape.', async(): Promise<void> => {
    converter.handleSafe = jest.fn((): Promise<Representation> => Promise.resolve(
      new BasicRepresentation(guardedStreamFrom([
        quad(namedNode('http://example.org/a'), namedNode('http://xmlns.com/foaf/0.1/name'), literal('Test')),
      ]), INTERNAL_QUADS),
    ));

    await expect(validator.handle(input)).rejects.toThrow(BadRequestHttpError);
    expect(converter.handleSafe).toHaveBeenCalledTimes(1);
    expect(fetchDataset).toHaveBeenCalledTimes(1);
    expect(fetchDataset).toHaveBeenLastCalledWith(shapeUrl);
  });
});
