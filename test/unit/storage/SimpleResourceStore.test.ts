import arrayifyStream from 'arrayify-stream';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';
import { QuadRepresentation } from '../../../src/ldp/representation/QuadRepresentation';
import { Readable } from 'stream';
import { RepresentationMetadata } from '../../../src/ldp/representation/RepresentationMetadata';
import { SimpleResourceStore } from '../../../src/storage/SimpleResourceStore';
import streamifyArray from 'streamify-array';
import { UnsupportedMediaTypeHttpError } from '../../../src/util/errors/UnsupportedMediaTypeHttpError';
import { namedNode, triple } from '@rdfjs/data-model';

const base = 'http://test.com/';

describe('A SimpleResourceStore', (): void => {
  let store: SimpleResourceStore;
  let representation: QuadRepresentation;
  const quad = triple(
    namedNode('http://test.com/s'),
    namedNode('http://test.com/p'),
    namedNode('http://test.com/o'),
  );

  beforeEach(async(): Promise<void> => {
    store = new SimpleResourceStore(base);

    representation = {
      data: streamifyArray([ quad ]),
      dataType: 'quad',
      metadata: {} as RepresentationMetadata,
    };
  });

  it('errors if a resource was not found.', async(): Promise<void> => {
    await expect(store.getRepresentation({ path: `${base}wrong` }, {})).rejects.toThrow(NotFoundHttpError);
    await expect(store.addResource({ path: 'http://wrong.com/wrong' }, representation))
      .rejects.toThrow(NotFoundHttpError);
    await expect(store.deleteResource({ path: 'wrong' })).rejects.toThrow(NotFoundHttpError);
    await expect(store.setRepresentation({ path: 'http://wrong.com/' }, representation))
      .rejects.toThrow(NotFoundHttpError);
  });

  it('errors when modifying resources.', async(): Promise<void> => {
    await expect(store.modifyResource()).rejects.toThrow(Error);
  });

  it('errors for wrong input data types.', async(): Promise<void> => {
    (representation as any).dataType = 'binary';
    await expect(store.addResource({ path: base }, representation)).rejects.toThrow(UnsupportedMediaTypeHttpError);
  });

  it('can write and read data.', async(): Promise<void> => {
    const identifier = await store.addResource({ path: base }, representation);
    expect(identifier.path.startsWith(base)).toBeTruthy();
    const result = await store.getRepresentation(identifier, { type: [{ value: 'internal/quads', weight: 1 }]});
    expect(result).toEqual({
      dataType: 'quad',
      data: expect.any(Readable),
      metadata: {
        profiles: [],
        raw: [],
      },
    });
    await expect(arrayifyStream(result.data)).resolves.toEqualRdfQuadArray([ quad ]);
  });

  it('can add resources to previously added resources.', async(): Promise<void> => {
    const identifier = await store.addResource({ path: base }, representation);
    representation.data = streamifyArray([ quad ]);
    const childIdentifier = await store.addResource(identifier, representation);
    expect(childIdentifier.path).toContain(identifier.path);
  });

  it('can read binary data.', async(): Promise<void> => {
    const identifier = await store.addResource({ path: base }, representation);
    expect(identifier.path.startsWith(base)).toBeTruthy();
    const result = await store.getRepresentation(identifier, { type: [{ value: 'text/turtle', weight: 1 }]});
    expect(result).toEqual({
      dataType: 'binary',
      data: expect.any(Readable),
      metadata: {
        profiles: [],
        raw: [],
        contentType: 'text/turtle',
      },
    });
    await expect(arrayifyStream(result.data)).resolves.toContain(
      `<${quad.subject.value}> <${quad.predicate.value}> <${quad.object.value}>`,
    );
  });

  it('returns turtle data if no preference was set.', async(): Promise<void> => {
    const identifier = await store.addResource({ path: base }, representation);
    expect(identifier.path.startsWith(base)).toBeTruthy();
    const result = await store.getRepresentation(identifier, { });
    expect(result).toEqual({
      dataType: 'binary',
      data: expect.any(Readable),
      metadata: {
        profiles: [],
        raw: [],
        contentType: 'text/turtle',
      },
    });
    await expect(arrayifyStream(result.data)).resolves.toContain(
      `<${quad.subject.value}> <${quad.predicate.value}> <${quad.object.value}>`,
    );
  });

  it('can set data.', async(): Promise<void> => {
    await store.setRepresentation({ path: base }, representation);
    const result = await store.getRepresentation({ path: base }, { type: [{ value: 'internal/quads', weight: 1 }]});
    expect(result).toEqual({
      dataType: 'quad',
      data: expect.any(Readable),
      metadata: {
        profiles: [],
        raw: [],
      },
    });
    await expect(arrayifyStream(result.data)).resolves.toEqualRdfQuadArray([ quad ]);
  });

  it('can delete data.', async(): Promise<void> => {
    await store.deleteResource({ path: base });
    await expect(store.getRepresentation({ path: base }, {})).rejects.toThrow(NotFoundHttpError);
  });
});
