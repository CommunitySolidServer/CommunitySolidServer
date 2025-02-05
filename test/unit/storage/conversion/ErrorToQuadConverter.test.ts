import 'jest-rdf';
import { DataFactory as DF } from 'n3';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import { ErrorToQuadConverter } from '../../../../src/storage/conversion/ErrorToQuadConverter';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { arrayifyStream } from '../../../../src/util/StreamUtil';
import { DC, SOLID_ERROR } from '../../../../src/util/Vocabularies';

describe('An ErrorToQuadConverter', (): void => {
  const identifier = { path: 'http://test.com/error' };
  const converter = new ErrorToQuadConverter();
  const preferences = {};

  it('supports going from errors to quads.', async(): Promise<void> => {
    await expect(converter.getOutputTypes('internal/error')).resolves.toEqual({ 'internal/quads': 1 });
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
      DF.quad(DF.namedNode(identifier.path), DC.terms.title, DF.literal('BadRequestHttpError')),
      DF.quad(DF.namedNode(identifier.path), DC.terms.description, DF.literal('error text')),
      DF.quad(DF.namedNode(identifier.path), SOLID_ERROR.terms.stack, DF.literal(error.stack!)),
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
      DF.quad(DF.namedNode(identifier.path), DC.terms.title, DF.literal('BadRequestHttpError')),
      DF.quad(DF.namedNode(identifier.path), DC.terms.description, DF.literal('error text')),
    ]);
  });
});
