import arrayifyStream from 'arrayify-stream';
import { BinaryRepresentation } from '../../../src/ldp/representation/BinaryRepresentation';
import { FileResourceStore } from '../../../src/storage/FileResourceStore';
import fsPromises from 'fs/promises';
import { InteractionController } from '../../../src/util/InteractionController';
import { MethodNotAllowedHttpError } from '../../../src/util/errors/MethodNotAllowedHttpError';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';
import { Readable } from 'stream';
import { RepresentationMetadata } from '../../../src/ldp/representation/RepresentationMetadata';
import streamifyArray from 'streamify-array';
import { UnsupportedMediaTypeHttpError } from '../../../src/util/errors/UnsupportedMediaTypeHttpError';
import { DATA_TYPE_BINARY, DATA_TYPE_QUAD } from '../../../src/util/ContentTypes';
import fs, { Stats } from 'fs';
import { LINK_TYPE_LDP_BC, LINK_TYPE_LDPR } from '../../../src/util/LinkTypes';
import { namedNode, triple } from '@rdfjs/data-model';

const base = 'http://test.com/';
const root = '/Users/default/home/public/';

jest.mock('fs/promises');

describe('A FileResourceStore', (): void => {
  let store: FileResourceStore;
  let representation: BinaryRepresentation;
  let stats: Stats;
  const rawData = 'lorem ipsum dolor sit amet consectetur adipiscing';
  const quad = triple(
    namedNode('http://test.com/s'),
    namedNode('http://test.com/p'),
    namedNode('http://test.com/o'),
  );

  fs.createReadStream = jest.fn();

  beforeEach(async(): Promise<void> => {
    store = new FileResourceStore(base, root, new InteractionController());

    representation = {
      data: streamifyArray([ rawData ]),
      dataType: DATA_TYPE_BINARY,
      metadata: {} as RepresentationMetadata,
    };

    stats = {
      isDirectory(): boolean {
        return false;
      },
      isFile(): boolean {
        return false;
      },
      size: 0,
      mtime: new Date(),
    } as unknown as Stats;

    // eslint-disable-next-line dot-notation
    store['createDataFile'] = jest.fn();
    // eslint-disable-next-line dot-notation
    (store['createDataFile'] as jest.Mock).mockReturnValue(true);
  });

  it('errors if a resource was not found.', async(): Promise<void> => {
    await expect(store.getRepresentation({ path: 'http://wrong.com/wrong' })).rejects.toThrow(NotFoundHttpError);
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

  it('errors for wrong input data types.', async(): Promise<void> => {
    (representation as any).dataType = DATA_TYPE_QUAD;
    await expect(store.addResource({ path: base }, representation)).rejects.toThrow(UnsupportedMediaTypeHttpError);
  });

  it('can write and read a container.', async(): Promise<void> => {
    // Mock the fs functions.
    // Add
    (fsPromises.mkdir as jest.Mock).mockReturnValueOnce(true);

    // Mock: Get
    stats.isFile = (): any => false;
    stats.isDirectory = (): any => true;
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    (fsPromises.readdir as jest.Mock).mockReturnValueOnce([]);
    (fs.createReadStream as jest.Mock).mockImplementationOnce((): any => new Error('Metadata file does not exist.'));

    // Write container (POST)
    (representation as any).metadata = { linkType: LINK_TYPE_LDP_BC, slug: 'myContainer/', raw: []};
    const identifier = await store.addResource({ path: base }, representation);
    expect(identifier.path).toBe(`${base}myContainer/`);

    // Read container
    const result = await store.getRepresentation(identifier);
    expect(result).toEqual({
      dataType: DATA_TYPE_QUAD,
      data: expect.any(Readable),
      metadata: {
        profiles: [],
        raw: [],
        dateTime: stats.mtime,
      },
    });
    await expect(arrayifyStream(result.data)).resolves.toBeDefined();
  });

  it('errors for container creation with path to non container.', async(): Promise<void> => {
    // Mock the fs functions.
    (fsPromises.mkdir as jest.Mock).mockReturnValueOnce(true);
    stats.isDirectory = (): any => false;
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);

    // Tests
    (representation as any).metadata = { linkType: LINK_TYPE_LDP_BC, slug: 'myContainer/', raw: []};
    await expect(store.addResource({ path: `${base}/foo` }, representation)).rejects.toThrow(MethodNotAllowedHttpError);
  });

  it('errors 405 for POST non existing path ending without slash.', async(): Promise<void> => {
    // Mock the fs functions.
    (fsPromises.lstat as jest.Mock).mockImplementationOnce((): any => {
      throw new Error('Path does not exist.');
    });

    (representation as any).metadata = { linkType: LINK_TYPE_LDP_BC, slug: 'myContainer/', raw: []};
    await expect(store.addResource({ path: `${base}/doesnotexist` }, representation))
      .rejects.toThrow(MethodNotAllowedHttpError);
  });

  it('can set data.', async(): Promise<void> => {
    // Mock the fs functions.
    // Set
    (fsPromises.lstat as jest.Mock).mockImplementationOnce((): any => {
      throw new Error('Path does not exist.');
    });
    (fsPromises.mkdir as jest.Mock).mockReturnValue(true);
    stats.isDirectory = (): any => true;
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);

    // Mock: Get
    stats.isFile = (): any => true;
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    (fs.createReadStream as jest.Mock).mockReturnValueOnce(streamifyArray([ rawData ]));
    (fs.createReadStream as jest.Mock).mockImplementationOnce((): any => new Error('Metadata file does not exist.'));

    // Tests
    await store.setRepresentation({ path: `${base}file.txt` }, representation);
    const result = await store.getRepresentation({ path: `${base}file.txt` });
    expect(result).toEqual({
      dataType: DATA_TYPE_BINARY,
      data: expect.any(Readable),
      metadata: {
        profiles: [],
        raw: [],
        dateTime: stats.mtime,
        byteSize: stats.size,
      },
    });
    await expect(arrayifyStream(result.data)).resolves.toEqual([ rawData ]);
  });

  it('can delete data.', async(): Promise<void> => {
    // Mock the fs functions.
    // Delete
    stats.isFile = (): any => true;
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    (fsPromises.unlink as jest.Mock).mockReturnValueOnce(true);
    (fsPromises.unlink as jest.Mock).mockImplementationOnce((): any => {
      throw new Error('Metadata file does not exist.');
    });

    // Mock: Get
    (fsPromises.lstat as jest.Mock).mockImplementationOnce((): any => {
      throw new Error('Path does not exist.');
    });

    // Tests
    await store.deleteResource({ path: `${base}file.txt` });
    await expect(store.getRepresentation({ path: `${base}file.txt` })).rejects.toThrow(NotFoundHttpError);
  });
});
