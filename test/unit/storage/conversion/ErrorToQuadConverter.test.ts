import 'jest-rdf';
import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'n3';
import { BasicRepresentation } from '../../../../src/ldp/representation/BasicRepresentation';
import { ErrorToQuadConverter } from '../../../../src/storage/conversion/ErrorToQuadConverter';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import { DC, SOLID_ERROR } from '../../../../src/util/Vocabularies';
const { literal, namedNode, quad } = DataFactory;

describe('An ErrorToQuadConverter', (): void => {
  const identifier = { path: 'http://test.com/error' };
  const converter = new ErrorToQuadConverter();
  const preferences = {};

  it('supports going from errors to quads.', async(): Promise<void> => {
    await expect(converter.getInputTypes()).resolves.toEqual({ 'internal/error': 1 });
    await expect(converter.getOutputTypes()).resolves.toEqual({ 'internal/quads': 1 });
  });

  it('does not support multiple errors.', async(): Promise<void> => {
    const representation = new BasicRepresentation([ new Error('a'), new Error('b') ], 'internal/error', false);
    const prom = converter.handle({ identifier, representation, preferences });
    await expect(prom).rejects.toThrow('Only single errors are supported.');
    await expect(prom).rejects.toThrow(InternalServerError);
  });

  it('adds triples for all error fields.', async(): Promise<void> => {
    const error = new BadRequestHttpError('error text');
    const representation = new BasicRepresentation([ error ], 'internal/error', false);
    const prom = converter.handle({ identifier, representation, preferences });
    await expect(prom).resolves.toBeDefined();
    const result = await prom;
    expect(result.binary).toBe(false);
    expect(result.metadata.contentType).toBe('internal/quads');
    const quads = await arrayifyStream(result.data);
    expect(quads).toBeRdfIsomorphic([
      quad(namedNode(identifier.path), DC.terms.title, literal('BadRequestHttpError')),
      quad(namedNode(identifier.path), DC.terms.description, literal('error text')),
      quad(namedNode(identifier.path), SOLID_ERROR.terms.stack, literal(error.stack!)),
    ]);
  });

  it('only adds stack if it is defined.', async(): Promise<void> => {
    const error = new BadRequestHttpError('error text');
    delete error.stack;
    const representation = new BasicRepresentation([ error ], 'internal/error', false);
    const prom = converter.handle({ identifier, representation, preferences });
    await expect(prom).resolves.toBeDefined();
    const result = await prom;
    expect(result.binary).toBe(false);
    expect(result.metadata.contentType).toBe('internal/quads');
    const quads = await arrayifyStream(result.data);
    expect(quads).toBeRdfIsomorphic([
      quad(namedNode(identifier.path), DC.terms.title, literal('BadRequestHttpError')),
      quad(namedNode(identifier.path), DC.terms.description, literal('error text')),
    ]);
  });
});
