import { namedNode, triple } from '@rdfjs/data-model';
import arrayifyStream from 'arrayify-stream';
import streamifyArray from 'streamify-array';
import { Representation } from '../../../../src/ldp/representation/Representation';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';
import { RepresentationPreferences } from '../../../../src/ldp/representation/RepresentationPreferences';
import { ResourceIdentifier } from '../../../../src/ldp/representation/ResourceIdentifier';
import { QuadToTurtleConverter } from '../../../../src/storage/conversion/QuadToTurtleConverter';
import { INTERNAL_QUADS } from '../../../../src/util/ContentTypes';
import { CONTENT_TYPE } from '../../../../src/util/MetadataTypes';

describe('A QuadToTurtleConverter', (): void => {
  const converter = new QuadToTurtleConverter();
  const identifier: ResourceIdentifier = { path: 'path' };
  const metadata = new RepresentationMetadata();
  metadata.add(CONTENT_TYPE, INTERNAL_QUADS);

  it('can handle quad to turtle conversions.', async(): Promise<void> => {
    const representation = { metadata } as Representation;
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
      metadata,
    } as Representation;
    const preferences: RepresentationPreferences = { type: [{ value: 'text/turtle', weight: 1 }]};
    const result = await converter.handle({ identifier, representation, preferences });
    expect(result).toMatchObject({
      binary: true,
      metadata: expect.any(RepresentationMetadata),
    });
    expect(result.metadata.get(CONTENT_TYPE)?.value).toEqual('text/turtle');
    await expect(arrayifyStream(result.data)).resolves.toContain(
      '<http://test.com/s> <http://test.com/p> <http://test.com/o>',
    );
  });
});
