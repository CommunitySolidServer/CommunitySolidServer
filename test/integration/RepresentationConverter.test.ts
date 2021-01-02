import type { Representation } from '../../src/ldp/representation/Representation';
import { RepresentationMetadata } from '../../src/ldp/representation/RepresentationMetadata';
import { ChainedConverter } from '../../src/storage/conversion/ChainedConverter';
import { QuadToRdfConverter } from '../../src/storage/conversion/QuadToRdfConverter';
import { RdfToQuadConverter } from '../../src/storage/conversion/RdfToQuadConverter';
import { guardedStreamFrom, readableToString } from '../../src/util/StreamUtil';
import { CONTENT_TYPE } from '../../src/util/Vocabularies';

describe('A ChainedConverter', (): void => {
  const converters = [
    new RdfToQuadConverter(),
    new QuadToRdfConverter(),
  ];
  const converter = new ChainedConverter(converters);

  it('can convert from JSON-LD to turtle.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata({ [CONTENT_TYPE]: 'application/ld+json' });
    const representation: Representation = {
      binary: true,
      data: guardedStreamFrom(
        [ '{"@id": "http://test.com/s", "http://test.com/p": { "@id": "http://test.com/o" }}' ],
      ),
      metadata,
    };

    const result = await converter.handleSafe({
      representation,
      preferences: { type: [{ value: 'text/turtle', weight: 1 }]},
      identifier: { path: 'path' },
    });

    await expect(readableToString(result.data)).resolves.toEqual('<http://test.com/s> <http://test.com/p> <http://test.com/o>.\n');
    expect(result.metadata.contentType).toEqual('text/turtle');
  });

  it('can convert from turtle to JSON-LD.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata({ [CONTENT_TYPE]: 'text/turtle' });
    const representation: Representation = {
      binary: true,
      data: guardedStreamFrom([ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ]),
      metadata,
    };

    const result = await converter.handleSafe({
      representation,
      preferences: { type: [{ value: 'application/ld+json', weight: 1 }]},
      identifier: { path: 'path' },
    });

    expect(JSON.parse(await readableToString(result.data))).toEqual(
      [{ '@id': 'http://test.com/s', 'http://test.com/p': [{ '@id': 'http://test.com/o' }]}],
    );
    expect(result.metadata.contentType).toEqual('application/ld+json');
  });
});
