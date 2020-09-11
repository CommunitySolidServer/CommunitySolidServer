import { Readable } from 'stream';
import streamifyArray from 'streamify-array';
import { Representation } from '../../../src/ldp/representation/Representation';
import { RepresentationMetadata } from '../../../src/ldp/representation/RepresentationMetadata';
import { InMemoryResourceStore } from '../../../src/storage/InMemoryResourceStore';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';
import { readableToString } from '../../../src/util/Util';

const base = 'http://test.com/';

describe('A InMemoryResourceStore', (): void => {
  let store: InMemoryResourceStore;
  let representation: Representation;
  const dataString = '<http://test.com/s> <http://test.com/p> <http://test.com/o>.';

  beforeEach(async(): Promise<void> => {
    store = new InMemoryResourceStore(base);

    representation = {
      binary: true,
      data: streamifyArray([ dataString ]),
      metadata: {} as RepresentationMetadata,
    };
  });

  it('errors if a resource was not found.', async(): Promise<void> => {
    await expect(store.getRepresentation({ path: `${base}wrong` })).rejects.toThrow(NotFoundHttpError);
    await expect(store.addResource({ path: 'http://wrong.com/wrong' }, representation))
      .rejects.toThrow(NotFoundHttpError);
    await expect(store.deleteResource({ path: 'wrong' })).rejects.toThrow(NotFoundHttpError);
    await expect(store.setRepresentation({ path: 'http://wrong.com/' }, representation))
      .rejects.toThrow(NotFoundHttpError);
  });

  it('errors when modifying resources.', async(): Promise<void> => {
    await expect(store.modifyResource()).rejects.toThrow(Error);
  });

  it('can write and read data.', async(): Promise<void> => {
    const identifier = await store.addResource({ path: base }, representation);
    expect(identifier.path.startsWith(base)).toBeTruthy();
    const result = await store.getRepresentation(identifier);
    expect(result).toEqual({
      binary: true,
      data: expect.any(Readable),
      metadata: representation.metadata,
    });
    await expect(readableToString(result.data)).resolves.toEqual(dataString);
  });

  it('can add resources to previously added resources.', async(): Promise<void> => {
    const identifier = await store.addResource({ path: base }, representation);
    representation.data = streamifyArray([ ]);
    const childIdentifier = await store.addResource(identifier, representation);
    expect(childIdentifier.path).toContain(identifier.path);
  });

  it('can set data.', async(): Promise<void> => {
    await store.setRepresentation({ path: base }, representation);
    const result = await store.getRepresentation({ path: base });
    expect(result).toEqual({
      binary: true,
      data: expect.any(Readable),
      metadata: representation.metadata,
    });
    await expect(readableToString(result.data)).resolves.toEqual(dataString);
  });

  it('can delete data.', async(): Promise<void> => {
    await store.deleteResource({ path: base });
    await expect(store.getRepresentation({ path: base })).rejects.toThrow(NotFoundHttpError);
  });
});
