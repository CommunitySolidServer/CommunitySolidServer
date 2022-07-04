import 'jest-rdf';
import { Readable } from 'stream';
import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'n3';
import rdfParser from 'rdf-parse';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import type { RepresentationPreferences } from '../../../../src/http/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import { RdfToQuadConverter } from '../../../../src/storage/conversion/RdfToQuadConverter';
import { INTERNAL_QUADS } from '../../../../src/util/ContentTypes';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
const { namedNode, triple } = DataFactory;

describe('A RdfToQuadConverter', (): void => {
  const converter = new RdfToQuadConverter();
  const identifier: ResourceIdentifier = { path: 'path' };

  it('supports serializing as quads.', async(): Promise<void> => {
    const types = rdfParser.getContentTypes()
      .then((inputTypes): string[] => inputTypes.filter((type): boolean => type !== 'application/json'));
    for (const type of await types) {
      await expect(converter.getOutputTypes(type)).resolves.toEqual({ [INTERNAL_QUADS]: 1 });
    }
  });

  it('may not handle application/json to quad conversion.', async(): Promise<void> => {
    await expect(converter.getOutputTypes('application/json')).resolves.toEqual({ });
  });

  it('can handle turtle to quad conversions.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata('text/turtle');
    const representation = { metadata } as Representation;
    const preferences: RepresentationPreferences = { type: { [INTERNAL_QUADS]: 1 }};
    await expect(converter.canHandle({ identifier, representation, preferences })).resolves.toBeUndefined();
  });

  it('can handle JSON-LD to quad conversions.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata('application/ld+json');
    const representation = { metadata } as Representation;
    const preferences: RepresentationPreferences = { type: { [INTERNAL_QUADS]: 1 }};
    await expect(converter.canHandle({ identifier, representation, preferences })).resolves.toBeUndefined();
  });

  it('converts turtle to quads.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata('text/turtle');
    const representation = new BasicRepresentation(
      '<http://test.com/s> <http://test.com/p> <http://test.com/o>.', metadata,
    );
    const preferences: RepresentationPreferences = { type: { [INTERNAL_QUADS]: 1 }};
    const result = await converter.handle({ identifier, representation, preferences });
    expect(result).toEqual({
      binary: false,
      data: expect.any(Readable),
      metadata: expect.any(RepresentationMetadata),
    });
    expect(result.metadata.contentType).toEqual(INTERNAL_QUADS);
    await expect(arrayifyStream(result.data)).resolves.toEqualRdfQuadArray([ triple(
      namedNode('http://test.com/s'),
      namedNode('http://test.com/p'),
      namedNode('http://test.com/o'),
    ) ]);
  });

  it('converts JSON-LD to quads.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata('application/ld+json');
    const representation = new BasicRepresentation(
      '{"@id": "http://test.com/s", "http://test.com/p": { "@id": "http://test.com/o" }}', metadata,
    );
    const preferences: RepresentationPreferences = { type: { [INTERNAL_QUADS]: 1 }};
    const result = await converter.handle({ identifier, representation, preferences });
    expect(result).toEqual({
      binary: false,
      data: expect.any(Readable),
      metadata: expect.any(RepresentationMetadata),
    });
    expect(result.metadata.contentType).toEqual(INTERNAL_QUADS);
    await expect(arrayifyStream(result.data)).resolves.toEqualRdfQuadArray([ triple(
      namedNode('http://test.com/s'),
      namedNode('http://test.com/p'),
      namedNode('http://test.com/o'),
    ) ]);
  });

  it('throws an BadRequestHttpError on invalid triple data.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata('text/turtle');
    const representation = new BasicRepresentation(
      '<http://test.com/s> <http://test.com/p> <http://test.co', metadata,
    );
    const preferences: RepresentationPreferences = { type: { [INTERNAL_QUADS]: 1 }};
    const result = await converter.handle({ identifier, representation, preferences });
    expect(result).toEqual({
      binary: false,
      data: expect.any(Readable),
      metadata: expect.any(RepresentationMetadata),
    });
    expect(result.metadata.contentType).toEqual(INTERNAL_QUADS);
    await expect(arrayifyStream(result.data)).rejects.toThrow(BadRequestHttpError);
  });
});
