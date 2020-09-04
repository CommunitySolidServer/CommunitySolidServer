import streamifyArray from 'streamify-array';
import { Representation } from '../../src/ldp/representation/Representation';
import { ChainedConverter } from '../../src/storage/conversion/ChainedConverter';
import { QuadToRdfConverter } from '../../src/storage/conversion/QuadToRdfConverter';
import { RdfToQuadConverter } from '../../src/storage/conversion/RdfToQuadConverter';
import { readableToString } from '../../src/util/Util';

describe('A ChainedConverter', (): void => {
  const converters = [
    new RdfToQuadConverter(),
    new QuadToRdfConverter(),
  ];
  const converter = new ChainedConverter(converters);

  it('can convert from JSON-LD to turtle.', async(): Promise<void> => {
    const representation: Representation = {
      binary: true,
      data: streamifyArray([ '{"@id": "http://test.com/s", "http://test.com/p": { "@id": "http://test.com/o" }}' ]),
      metadata: { raw: [], contentType: 'application/ld+json' },
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
    const representation: Representation = {
      binary: true,
      data: streamifyArray([ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ]),
      metadata: { raw: [], contentType: 'text/turtle' },
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
