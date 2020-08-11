import arrayifyStream from 'arrayify-stream';
import { BinaryRepresentation } from '../../../src/ldp/representation/BinaryRepresentation';
import { FileResourceStore } from '../../../src/storage/FileResourceStore';
import fs from 'fs';
import { LINK_TYPE_LDP_BC } from '../../../src/util/LinkTypes';
import { MethodNotAllowedHttpError } from '../../../src/util/errors/MethodNotAllowedHttpError';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';
import { Readable } from 'stream';
import { RepresentationMetadata } from '../../../src/ldp/representation/RepresentationMetadata';
import streamifyArray from 'streamify-array';
import { UnsupportedMediaTypeHttpError } from '../../../src/util/errors/UnsupportedMediaTypeHttpError';
import { DATA_TYPE_BINARY, DATA_TYPE_QUAD } from '../../../src/util/ContentTypes';
import { namedNode, triple } from '@rdfjs/data-model';

const base = 'http://test.com/';
const root = '/Users/default/home/public/';

describe('A FileResourceStore', (): void => {
  let store: FileResourceStore;
  let representation: BinaryRepresentation;
  let stats: fs.Stats;
  const rawData = 'lorem ipsum dolor sit amet consectetur adipiscing';

  beforeEach(async(): Promise<void> => {
    store = new FileResourceStore(base, root);

    representation = {
      data: streamifyArray([ rawData ]),
      dataType: DATA_TYPE_BINARY,
      metadata: {} as RepresentationMetadata,
    };

    stats = {
      atime: new Date(),
      atimeMs: 0,
      birthtime: new Date(),
      birthtimeMs: 0,
      blksize: 0,
      blocks: 0,
      ctime: new Date(),
      ctimeMs: 0,
      dev: 0,
      gid: 0,
      ino: 0,
      isBlockDevice(): boolean {
        return false;
      },
      isCharacterDevice(): boolean {
        return false;
      },
      isDirectory(): boolean {
        return false;
      },
      isFIFO(): boolean {
        return false;
      },
      isFile(): boolean {
        return false;
      },
      isSocket(): boolean {
        return false;
      },
      isSymbolicLink(): boolean {
        return false;
      },
      mode: 0,
      mtime: new Date(),
      mtimeMs: 0,
      nlink: 0,
      rdev: 0,
      size: 0,
      uid: 0,
    };
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
    fs.promises.mkdir = jest.fn();
    (fs.promises.mkdir as jest.Mock).mockReturnValue(true);
    fs.promises.lstat = jest.fn();
    stats.isDirectory = (): any => true;
    (fs.promises.lstat as jest.Mock).mockReturnValueOnce(stats);
    stats.isFile = (): any => true;
    (fs.promises.lstat as jest.Mock).mockReturnValueOnce(stats);
    const quad = triple(
      namedNode(`${base}myContainer/`),
      namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      namedNode('http://www.w3.org/ns/ldp#BasicContainer'),
    );
    fs.createReadStream = jest.fn();
    (fs.createReadStream as jest.Mock).mockReturnValueOnce(streamifyArray([ quad ]));
    (fs.createReadStream as jest.Mock).mockImplementation((): any => new Error('Metadata file does not exist.'));

    // Write container (POST)
    (representation as any).metadata = { linkType: LINK_TYPE_LDP_BC, slug: 'myContainer/' };
    const identifier = await store.addResource({ path: base }, representation);
    expect(identifier.path).toBe(`${base}myContainer/`);

    // Read container
    const result = await store.getRepresentation(identifier);
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
    await expect(arrayifyStream(result.data)).resolves.toEqualRdfQuadArray([ quad ]);
  });

  it('errors for container creation with path to non container.', async(): Promise<void> => {
    // Mock the fs functions.
    fs.promises.mkdir = jest.fn();
    (fs.promises.mkdir as jest.Mock).mockReturnValue(true);
    fs.promises.lstat = jest.fn();
    stats.isDirectory = (): any => false;
    (fs.promises.lstat as jest.Mock).mockReturnValue(stats);

    // Tests
    (representation as any).metadata = { linkType: LINK_TYPE_LDP_BC, slug: 'myContainer/' };
    await expect(store.addResource({ path: `${base}/foo` }, representation)).rejects.toThrow(MethodNotAllowedHttpError);
  });

  it('errors 405 for POST non existing path ending without slash.', async(): Promise<void> => {
    // Mock the fs functions.
    fs.promises.lstat = jest.fn();
    (fs.promises.lstat as jest.Mock).mockImplementation((): any => {
      throw new Error('Path does not exist.');
    });

    (representation as any).metadata = { linkType: LINK_TYPE_LDP_BC, slug: 'myContainer/' };
    await expect(store.addResource({ path: `${base}/doesnotexist` }, representation))
      .rejects.toThrow(MethodNotAllowedHttpError);
  });

  it('can set data.', async(): Promise<void> => {
    // Mock the fs functions.
    // Set
    fs.promises.lstat = jest.fn();
    (fs.promises.lstat as jest.Mock).mockImplementationOnce((): any => {
      throw new Error('Path does not exist.');
    });
    stats.isDirectory = (): any => true;
    (fs.promises.lstat as jest.Mock).mockReturnValueOnce(stats);
    fs.promises.mkdir = jest.fn();
    (fs.promises.mkdir as jest.Mock).mockReturnValue(true);
    fs.createWriteStream = jest.fn();
    const writeStream = {
      write: (): any => true,
      end: (): any => true,
      on(name: string, func: () => void): any {
        if (name === 'finish') {
          func();
        }
      },
    };
    (fs.createWriteStream as jest.Mock).mockReturnValueOnce(writeStream);

    // Mock: Get
    stats.isFile = (): any => true;
    (fs.promises.lstat as jest.Mock).mockReturnValueOnce(stats);
    fs.createReadStream = jest.fn();
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
    fs.promises.lstat = jest.fn();
    stats.isFile = (): any => true;
    (fs.promises.lstat as jest.Mock).mockReturnValueOnce(stats);
    fs.promises.unlink = jest.fn();
    (fs.promises.unlink as jest.Mock).mockReturnValueOnce(true);
    (fs.promises.unlink as jest.Mock).mockImplementationOnce((): any => {
      throw new Error('Metadata file does not exist.');
    });

    // Mock: Get
    (fs.promises.lstat as jest.Mock).mockImplementationOnce((): any => {
      throw new Error('Path does not exist.');
    });

    // Tests
    await store.deleteResource({ path: `${base}file.txt` });
    await expect(store.getRepresentation({ path: `${base}file.txt` })).rejects.toThrow(NotFoundHttpError);
  });
});
