import { Readable } from 'stream';
import { namedNode, triple } from '@rdfjs/data-model';
import arrayifyStream from 'arrayify-stream';
import streamifyArray from 'streamify-array';
import { Representation } from '../../../../src/ldp/representation/Representation';
import { RepresentationPreferences } from '../../../../src/ldp/representation/RepresentationPreferences';
import { ResourceIdentifier } from '../../../../src/ldp/representation/ResourceIdentifier';
import { QuadToTurtleConverter } from '../../../../src/storage/conversion/QuadToTurtleConverter';
import { CONTENT_TYPE_QUADS, DATA_TYPE_BINARY } from '../../../../src/util/ContentTypes';

describe('A QuadToTurtleConverter', (): void => {
  const converter = new QuadToTurtleConverter();
  const identifier: ResourceIdentifier = { path: 'path' };

  it('can handle quad to turtle conversions.', async(): Promise<void> => {
    const representation = { metadata: { contentType: CONTENT_TYPE_QUADS }} as Representation;
    const preferences: RepresentationPreferences = { type: [{ value: 'text/turtle', weight: 1 }]};
    await expect(converter.canHandle({ identifier, representation, preferences })).resolves.toBeUndefined();
  });

  it('converts quads to turtle.', async(): Promise<void> => {
    const representation = {
      data: streamifyArray([ triple(
        namedNode('http://test.com/s'),
        namedNode('http://test.com/p'),
        namedNode('http://test.com/o'),
      ) ]),
      metadata: { contentType: CONTENT_TYPE_QUADS },
    } as Representation;
    const preferences: RepresentationPreferences = { type: [{ value: 'text/turtle', weight: 1 }]};
    const result = await converter.handle({ identifier, representation, preferences });
    expect(result).toEqual({
      data: expect.any(Readable),
      dataType: DATA_TYPE_BINARY,
      metadata: {
        contentType: 'text/turtle',
      },
    });
    await expect(arrayifyStream(result.data)).resolves.toContain(
      '<http://test.com/s> <http://test.com/p> <http://test.com/o>',
    );
  });
});
