import 'jest-rdf';
import { Readable } from 'node:stream';
import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'n3';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import { INTERNAL_QUADS } from '../../../../src/util/ContentTypes';
import { guardedStreamFrom } from '../../../../src/util/StreamUtil';
import { CONTENT_TYPE } from '../../../../src/util/Vocabularies';

const { namedNode } = DataFactory;

describe('BasicRepresentation', (): void => {
  it('creates a representation with (data, metadata, binary).', (): void => {
    const data = guardedStreamFrom([ '' ]);
    const metadata = new RepresentationMetadata();
    const representation = new BasicRepresentation(data, metadata, true);
    expect(representation.data).toBe(data);
    expect(representation.metadata).toBe(metadata);
    expect(representation.binary).toBe(true);
  });

  it('creates a representation with (data, metadata).', (): void => {
    const data = guardedStreamFrom([ '' ]);
    let metadata = new RepresentationMetadata();
    let representation = new BasicRepresentation(data, metadata);
    expect(representation.data).toBe(data);
    expect(representation.metadata).toBe(metadata);
    expect(representation.binary).toBe(true);

    metadata = new RepresentationMetadata(INTERNAL_QUADS);
    representation = new BasicRepresentation(data, metadata);
    expect(representation.data).toBe(data);
    expect(representation.metadata).toBe(metadata);
    expect(representation.binary).toBe(false);
  });

  it('creates a representation with (unguarded data, metadata).', (): void => {
    const data = Readable.from([ '' ]);
    const metadata = new RepresentationMetadata();
    const representation = new BasicRepresentation(data, metadata);
    expect(representation.data).toBe(data);
    expect(representation.metadata).toBe(metadata);
    expect(representation.binary).toBe(true);
  });

  it('creates a representation with (array data, metadata).', async(): Promise<void> => {
    const data = [ 'my', 'data' ];
    const metadata = new RepresentationMetadata();
    const representation = new BasicRepresentation(data, metadata);
    await expect(arrayifyStream(representation.data)).resolves.toEqual(data);
    expect(representation.metadata).toBe(metadata);
    expect(representation.binary).toBe(true);
  });

  it('creates a representation with (string data, metadata).', async(): Promise<void> => {
    const data = 'my data';
    const metadata = new RepresentationMetadata();
    const representation = new BasicRepresentation(data, metadata);
    await expect(arrayifyStream(representation.data)).resolves.toEqual([ data ]);
    expect(representation.metadata).toBe(metadata);
    expect(representation.binary).toBe(true);
  });

  it('creates a representation with (data, metadata record).', (): void => {
    const data = guardedStreamFrom([ '' ]);
    const representation = new BasicRepresentation(data, { [CONTENT_TYPE]: 'text/custom' });
    expect(representation.data).toBe(data);
    expect(representation.metadata.contentType).toBe('text/custom');
    expect(representation.binary).toBe(true);
  });

  it('creates a representation with (data, content type).', (): void => {
    const data = guardedStreamFrom([ '' ]);
    const representation = new BasicRepresentation(data, 'text/custom');
    expect(representation.data).toBe(data);
    expect(representation.metadata.contentType).toBe('text/custom');
    expect(representation.binary).toBe(true);
  });

  it('creates a representation with (data, identifier, metadata record).', (): void => {
    const identifier = { path: 'http://example.org/#' };
    const data = guardedStreamFrom([ '' ]);
    const representation = new BasicRepresentation(data, identifier, { [CONTENT_TYPE]: 'text/custom' });
    expect(representation.data).toBe(data);
    expect(representation.metadata.identifier).toEqualRdfTerm(namedNode(identifier.path));
    expect(representation.metadata.contentType).toBe('text/custom');
    expect(representation.binary).toBe(true);
  });

  it('creates a representation with (data, identifier, content type).', (): void => {
    const identifier = { path: 'http://example.org/#' };
    const data = guardedStreamFrom([ '' ]);
    const representation = new BasicRepresentation(data, identifier, 'text/custom');
    expect(representation.data).toBe(data);
    expect(representation.metadata.identifier).toEqualRdfTerm(namedNode(identifier.path));
    expect(representation.metadata.contentType).toBe('text/custom');
    expect(representation.binary).toBe(true);
  });

  it('creates a representation with (data, identifier term, metadata record).', (): void => {
    const identifier = namedNode('http://example.org/#');
    const data = guardedStreamFrom([ '' ]);
    const representation = new BasicRepresentation(data, identifier, { [CONTENT_TYPE]: 'text/custom' });
    expect(representation.data).toBe(data);
    expect(representation.metadata.identifier).toBe(identifier);
    expect(representation.metadata.contentType).toBe('text/custom');
    expect(representation.binary).toBe(true);
  });

  it('creates a representation with (data, identifier term, content type).', (): void => {
    const identifier = namedNode('http://example.org/#');
    const data = guardedStreamFrom([ '' ]);
    const representation = new BasicRepresentation(data, identifier, 'text/custom');
    expect(representation.data).toBe(data);
    expect(representation.metadata.identifier).toBe(identifier);
    expect(representation.metadata.contentType).toBe('text/custom');
    expect(representation.binary).toBe(true);
  });
});
