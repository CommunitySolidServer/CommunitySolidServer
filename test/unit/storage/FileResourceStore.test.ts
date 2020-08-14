import arrayifyStream from 'arrayify-stream';
import { BinaryRepresentation } from '../../../src/ldp/representation/BinaryRepresentation';
import { ConflictHttpError } from '../../../src/util/errors/ConflictHttpError';
import { DataFactory } from 'n3';
import { FileResourceStore } from '../../../src/storage/FileResourceStore';
import fsPromises from 'fs/promises';
import { InteractionController } from '../../../src/util/InteractionController';
import { join as joinPath } from 'path';
import { MethodNotAllowedHttpError } from '../../../src/util/errors/MethodNotAllowedHttpError';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';
import { Readable } from 'stream';
import { RepresentationMetadata } from '../../../src/ldp/representation/RepresentationMetadata';
import streamifyArray from 'streamify-array';
import { UnsupportedMediaTypeHttpError } from '../../../src/util/errors/UnsupportedMediaTypeHttpError';
import { CONTENT_TYPE_QUADS, DATA_TYPE_BINARY, DATA_TYPE_QUAD } from '../../../src/util/ContentTypes';
import fs, { Stats } from 'fs';
import { LDP, RDF, STAT, TERMS, XML } from '../../../src/util/Prefixes';
import { LINK_TYPE_LDP_BC, LINK_TYPE_LDPR } from '../../../src/util/LinkTypes';
import { literal, namedNode, quad as quadRDF, triple } from '@rdfjs/data-model';

const base = 'http://test.com/';
const root = '/Users/default/home/public/';

jest.mock('fs/promises');

describe('A FileResourceStore', (): void => {
  let store: FileResourceStore;
  let representation: BinaryRepresentation;
  let readableMock: Readable;
  let stats: Stats;
  let stats1: Stats;
  let stats2: Stats;
  const rawData = 'lorem ipsum dolor sit amet consectetur adipiscing';
  const quad = triple(
    namedNode('http://test.com/s'),
    namedNode('http://test.com/p'),
    namedNode('http://test.com/o'),
  );

  fs.createReadStream = jest.fn();

  beforeEach(async(): Promise<void> => {
    jest.clearAllMocks();

    store = new FileResourceStore(base, root, new InteractionController());

    representation = {
      data: streamifyArray([ rawData ]),
      dataType: DATA_TYPE_BINARY,
      metadata: { raw: [], linkRel: { type: new Set() }} as unknown as RepresentationMetadata,
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
    stats1 = {
      isDirectory(): boolean {
        return false;
      },
      isFile(): boolean {
        return false;
      },
      size: 0,
      mtime: new Date(),
    } as unknown as Stats;
    stats2 = {
      isDirectory(): boolean {
        return false;
      },
      isFile(): boolean {
        return false;
      },
      size: 0,
      mtime: new Date(),
    } as unknown as Stats;

    // Mock the fs functions for the createDataFile function.
    fs.createWriteStream = jest.fn();
    const writeStream = {
      on(name: string, func: () => void): any {
        if (name === 'finish') {
          func();
        }
        return this;
      },
      once(): any {
        return this;
      },
      emit(): any {
        return true;
      },
      write(): any {
        return true;
      },
      end(): any {
        // Empty
      },
    };
    (fs.createWriteStream as jest.Mock).mockReturnValue(writeStream);

    readableMock = {
      on(name: string, func: () => void): any {
        if (name === 'finish') {
          func();
        }
        return this;
      },
      pipe(): any {
        return this;
      },
    } as unknown as Readable;
  });

  it('errors if a resource was not found.', async(): Promise<void> => {
    (fsPromises.lstat as jest.Mock).mockImplementationOnce((): any => {
      throw new Error('Path does not exist.');
    });
    (fsPromises.lstat as jest.Mock).mockImplementationOnce((): any => {
      throw new Error('Path does not exist.');
    });
    await expect(store.getRepresentation({ path: 'http://wrong.com/wrong' })).rejects.toThrow(NotFoundHttpError);
    await expect(store.getRepresentation({ path: `${base}wrong` })).rejects.toThrow(NotFoundHttpError);
    await expect(store.addResource({ path: 'http://wrong.com/wrong' }, representation))
      .rejects.toThrow(NotFoundHttpError);
    await expect(store.deleteResource({ path: 'wrong' })).rejects.toThrow(NotFoundHttpError);
    await expect(store.deleteResource({ path: `${base}wrong` })).rejects.toThrow(NotFoundHttpError);
    await expect(store.setRepresentation({ path: 'http://wrong.com/' }, representation))
      .rejects.toThrow(NotFoundHttpError);
  });

  it('errors when modifying resources.', async(): Promise<void> => {
    await expect(store.modifyResource()).rejects.toThrow(Error);
  });

  it('errors for wrong input data types.', async(): Promise<void> => {
    (representation as any).dataType = DATA_TYPE_QUAD;
    await expect(store.addResource({ path: base }, representation)).rejects.toThrow(UnsupportedMediaTypeHttpError);
    await expect(store.setRepresentation({ path: `${base}foo` }, representation)).rejects
      .toThrow(UnsupportedMediaTypeHttpError);
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
    (representation as any).metadata = { linkRel: { type: new Set() }, slug: 'myContainer/', raw: []};
    (representation as any).metadata.linkRel.type.add(LINK_TYPE_LDP_BC);
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
        contentType: CONTENT_TYPE_QUADS,
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
    (representation as any).metadata = { linkRel: { type: new Set() }, slug: 'myContainer/', raw: []};
    (representation as any).metadata.linkRel.type.add(LINK_TYPE_LDP_BC);
    await expect(store.addResource({ path: `${base}/foo` }, representation)).rejects.toThrow(MethodNotAllowedHttpError);
  });

  it('errors 405 for POST invalid path ending without slash.', async(): Promise<void> => {
    // Mock the fs functions.
    (fsPromises.lstat as jest.Mock).mockImplementationOnce((): any => {
      throw new Error('Path does not exist.');
    });
    (fsPromises.lstat as jest.Mock).mockImplementationOnce((): any => {
      throw new Error('Path does not exist.');
    });
    stats.isDirectory = (): any => false;
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);

    // Tests
    (representation as any).metadata = { linkRel: { type: new Set() }, slug: 'myContainer/', raw: []};
    (representation as any).metadata.linkRel.type.add(LINK_TYPE_LDP_BC);
    await expect(store.addResource({ path: `${base}/doesnotexist` }, representation))
      .rejects.toThrow(MethodNotAllowedHttpError);

    (representation as any).metadata = { linkRel: { type: new Set() }, slug: 'file.txt', raw: []};
    (representation as any).metadata.linkRel.type.add(LINK_TYPE_LDPR);
    await expect(store.addResource({ path: `${base}/doesnotexist` }, representation))
      .rejects.toThrow(MethodNotAllowedHttpError);

    (representation as any).metadata.linkRel.type.clear();
    (representation as any).metadata = { linkRel: { type: new Set() }, slug: 'file.txt', raw: []};
    await expect(store.addResource({ path: `${base}/existingresource` }, representation))
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
    stats1.isFile = (): any => true;
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats1);
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
        dateTime: stats1.mtime,
        byteSize: stats1.size,
        contentType: 'text/plain; charset=utf-8',
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

  it('creates intermediate container when POSTing resource to path ending with slash.', async(): Promise<void> => {
    // Mock the fs functions.
    (fsPromises.mkdir as jest.Mock).mockReturnValueOnce(true);
    stats.isDirectory = (): any => true;
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);

    // Tests
    (representation as any).metadata = { linkRel: { type: new Set() }, slug: 'file.txt', raw: []};
    (representation as any).metadata.linkRel.type.add(LINK_TYPE_LDPR);
    const identifier = await store.addResource({ path: `${base}doesnotexistyet/` }, representation);
    expect(identifier.path).toBe(`${base}doesnotexistyet/file.txt`);
  });

  it('creates metadata file when metadata triples are passed.', async(): Promise<void> => {
    // Mock the fs functions.
    // Add
    (fsPromises.mkdir as jest.Mock).mockReturnValueOnce(true);
    stats.isDirectory = (): any => true;
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);

    // Mock: Set
    (fsPromises.lstat as jest.Mock).mockImplementationOnce((): any => {
      throw new Error('Path does not exist.');
    });
    (fsPromises.mkdir as jest.Mock).mockReturnValueOnce(true);
    stats1.isDirectory = (): any => true;
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats1);

    // Tests
    (representation as any).metadata = { linkRel: { type: new Set() }, raw: [ quad ]};
    (representation as any).metadata.linkRel.type.add(LINK_TYPE_LDPR);
    (representation as any).data = readableMock;
    await store.addResource({ path: `${base}foo/` }, representation);

    (representation as any).metadata = { linkRel: { type: new Set() }, raw: [ quad ]};
    (representation as any).metadata.linkRel.type.add(LINK_TYPE_LDPR);
    await store.setRepresentation({ path: `${base}foo/file.txt` }, representation);
    expect(fs.createWriteStream as jest.Mock).toBeCalledTimes(4);
  });

  it('errors when deleting root container.', async(): Promise<void> => {
    // Tests
    await expect(store.deleteResource({ path: base })).rejects.toThrow(MethodNotAllowedHttpError);
  });

  it('errors when deleting non empty container.', async(): Promise<void> => {
    // Mock the fs functions.
    stats.isDirectory = (): any => true;
    stats.isFile = (): any => false;
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    (fsPromises.readdir as jest.Mock).mockReturnValueOnce([ '.metadata', 'file.txt' ]);

    // Tests
    await expect(store.deleteResource({ path: `${base}notempty/` })).rejects.toThrow(ConflictHttpError);
  });

  it('deletes metadata file when deleting container.', async(): Promise<void> => {
    // Mock the fs functions.
    stats.isDirectory = (): any => true;
    stats.isFile = (): any => false;
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    (fsPromises.readdir as jest.Mock).mockReturnValueOnce([ '.metadata', '.metadata.bak' ]);
    (fsPromises.unlink as jest.Mock).mockReturnValueOnce(true);
    (fsPromises.rmdir as jest.Mock).mockReturnValueOnce(true);

    // Tests
    await store.deleteResource({ path: `${base}foo/` });
    expect(fsPromises.unlink as jest.Mock).toBeCalledWith(`${root}foo/.metadata`);
    expect(fsPromises.unlink as jest.Mock).toBeCalledWith(`${root}foo/.metadata.bak`);
  });

  it('errors 404 when accessing non resource (file/directory), e.g. special files.', async(): Promise<void> => {
    // Mock the fs functions.
    stats.isDirectory = (): any => false;
    stats.isFile = (): any => false;
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);

    // Tests
    await expect(store.deleteResource({ path: `${base}dev/pts/14` })).rejects.toThrow(NotFoundHttpError);
    await expect(store.getRepresentation({ path: `${base}dev/pts/14` })).rejects.toThrow(NotFoundHttpError);
  });

  it('returns the quads of the files in a directory when a directory is queried.', async(): Promise<void> => {
    // Mock the fs functions.
    stats.isFile = (): any => false;
    stats.isDirectory = (): any => true;
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    (fsPromises.readdir as jest.Mock).mockReturnValueOnce([ 'file.txt', '.nonresource' ]);
    stats1.isFile = (): any => true;
    stats1.isDirectory = (): any => false;
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats1);
    stats2.isFile = (): any => false;
    stats2.isDirectory = (): any => false;
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats2);
    (fs.createReadStream as jest.Mock).mockImplementationOnce((): any => new Error('Metadata file does not exist.'));

    // Tests
    const containerNode = namedNode(`${base}foo/`);
    const fileNode = namedNode(`${base}foo/file.txt`);
    const quads = [
      quadRDF(containerNode, namedNode(`${RDF}type`), namedNode(`${LDP}Container`)),
      quadRDF(containerNode, namedNode(`${RDF}type`), namedNode(`${LDP}BasicContainer`)),
      quadRDF(containerNode, namedNode(`${RDF}type`), namedNode(`${LDP}Resource`)),
      quadRDF(containerNode, namedNode(`${STAT}size`), DataFactory.literal(stats.size)),
      quadRDF(containerNode, namedNode(`${TERMS}modified`), literal(stats.mtime.toUTCString(), `${XML}dateTime`)),
      quadRDF(containerNode, namedNode(`${STAT}mtime`), DataFactory.literal(stats.mtime.getTime() / 100)),
      quadRDF(containerNode, namedNode(`${LDP}contains`), fileNode),
      quadRDF(fileNode, namedNode(`${RDF}type`), namedNode(`${LDP}Resource`)),
      quadRDF(fileNode, namedNode(`${STAT}size`), DataFactory.literal(stats1.size)),
      quadRDF(fileNode, namedNode(`${TERMS}modified`), literal(stats1.mtime.toUTCString(), `${XML}dateTime`)),
      quadRDF(fileNode, namedNode(`${STAT}mtime`), DataFactory.literal(stats1.mtime.getTime() / 100)),
    ];
    const result = await store.getRepresentation({ path: `${base}foo/` });
    expect(result).toEqual({
      dataType: DATA_TYPE_QUAD,
      data: expect.any(Readable),
      metadata: {
        profiles: [],
        raw: [],
        dateTime: stats.mtime,
        contentType: CONTENT_TYPE_QUADS,
      },
    });
    await expect(arrayifyStream(result.data)).resolves.toEqualRdfQuadArray(quads);
  });

  it('can overwrite representation with PUT.', async(): Promise<void> => {
    // Mock the fs functions.
    stats.isFile = (): any => true;
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    (fsPromises.mkdir as jest.Mock).mockReturnValueOnce(true);
    stats1.isDirectory = (): any => true;
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats1);

    // Tests
    (representation as any).metadata = { linkRel: { type: new Set() }, raw: []};
    (representation as any).metadata.linkRel.type.add(LINK_TYPE_LDPR);
    await store.setRepresentation({ path: `${base}/alreadyexists.txt` }, representation);
    expect(fs.createWriteStream as jest.Mock).toBeCalledTimes(1);
  });

  it('errors when overwriting container with PUT.', async(): Promise<void> => {
    // Mock the fs functions.
    stats.isFile = (): any => false;
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    (fsPromises.access as jest.Mock).mockReturnValueOnce(true);

    // Tests
    await expect(store.setRepresentation({ path: `${base}/alreadyexists` }, representation)).rejects
      .toThrow(ConflictHttpError);
    (representation as any).metadata = { linkRel: { type: new Set() }, raw: []};
    (representation as any).metadata.linkRel.type.add(LINK_TYPE_LDP_BC);
    await expect(store.setRepresentation({ path: `${base}/alreadyexists/` }, representation)).rejects
      .toThrow(ConflictHttpError);
  });

  it('can create a container with PUT.', async(): Promise<void> => {
    // Mock the fs functions.
    (fsPromises.access as jest.Mock).mockImplementationOnce((): any => {
      throw new Error('Path does not exist.');
    });
    (fsPromises.mkdir as jest.Mock).mockReturnValueOnce(true);

    // Tests
    (representation as any).metadata = { linkRel: { type: new Set() }, raw: []};
    (representation as any).metadata.linkRel.type.add(LINK_TYPE_LDP_BC);
    await store.setRepresentation({ path: `${base}/foo/` }, representation);
    expect(fsPromises.mkdir as jest.Mock).toBeCalledTimes(1);
  });

  it('errors when mapping a filepath that does not match the rootFilepath of the store.', async(): Promise<void> => {
    expect((): any => {
      // eslint-disable-next-line dot-notation
      store['mapFilepathToUrl']('http://wrong.com/wrong');
    }).toThrowError();
    expect((): any => {
      // eslint-disable-next-line dot-notation
      store['mapFilepathToUrl'](`${base}file.txt`);
    }).toThrowError();
  });

  it('undoes metadata file creation when resource creation fails.', async(): Promise<void> => {
    // Mock the fs functions.
    (fsPromises.mkdir as jest.Mock).mockReturnValueOnce(true);
    stats.isDirectory = (): any => true;
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    // eslint-disable-next-line dot-notation
    store['createDataFile'] = jest.fn();
    // eslint-disable-next-line dot-notation
    (store['createDataFile'] as jest.Mock).mockReturnValueOnce(true);
    // eslint-disable-next-line dot-notation
    (store['createDataFile'] as jest.Mock).mockImplementationOnce((): any => {
      throw new Error('Failed to create new file.');
    });
    (fsPromises.unlink as jest.Mock).mockReturnValueOnce(true);

    // Tests
    (representation as any).metadata = { linkRel: { type: new Set() }, slug: 'file.txt', raw: [ quad ]};
    (representation as any).metadata.linkRel.type.add(LINK_TYPE_LDPR);
    await expect(store.addResource({ path: base }, representation)).rejects.toThrow(Error);
    // eslint-disable-next-line dot-notation
    expect(store['createDataFile'] as jest.Mock).toBeCalledTimes(2);
    expect(fsPromises.unlink as jest.Mock).toBeCalledWith(joinPath(root, 'file.txt.metadata'));
  });

  it('undoes container creation when metadata file creation fails.', async(): Promise<void> => {
    // Mock the fs functions.
    (fsPromises.mkdir as jest.Mock).mockReturnValueOnce(true);
    // eslint-disable-next-line dot-notation
    store['createDataFile'] = jest.fn();
    // eslint-disable-next-line dot-notation
    (store['createDataFile'] as jest.Mock).mockImplementationOnce((): any => {
      throw new Error('Failed to create new file.');
    });
    (fsPromises.rmdir as jest.Mock).mockReturnValueOnce(true);

    // Tests
    (representation as any).metadata = { linkRel: { type: new Set() }, slug: 'foo/', raw: [ quad ]};
    (representation as any).metadata.linkRel.type.add(LINK_TYPE_LDP_BC);
    await expect(store.addResource({ path: base }, representation)).rejects.toThrow(Error);
    expect(fsPromises.rmdir as jest.Mock).toBeCalledWith(joinPath(root, 'foo/'));
  });

  it('creates container when POSTing without linkRel and with slug ending with slash.', async(): Promise<void> => {
    // Mock the fs functions.
    // Add
    (fsPromises.mkdir as jest.Mock).mockReturnValueOnce(true);

    // Tests
    (representation as any).metadata = { slug: 'myContainer/', raw: []};
    const identifier = await store.addResource({ path: base }, representation);
    expect(identifier.path).toBe(`${base}myContainer/`);
    expect(fsPromises.mkdir as jest.Mock).toBeCalledTimes(1);
  });

  it('returns no contentType when unknown for representation.', async(): Promise<void> => {
    // Mock the fs functions.
    stats.isFile = (): any => true;
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    (fs.createReadStream as jest.Mock).mockReturnValueOnce(streamifyArray([ rawData ]));
    (fs.createReadStream as jest.Mock).mockImplementationOnce((): any => new Error('Metadata file does not exist.'));

    const result = await store.getRepresentation({ path: `${base}.htaccess` });
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
  });

  it('errors when performing a PUT on the root path.', async(): Promise<void> => {
    await expect(store.setRepresentation({ path: base }, representation)).rejects.toThrow(ConflictHttpError);
    await expect(store.setRepresentation({ path: base.slice(0, -1) }, representation)).rejects
      .toThrow(ConflictHttpError);
  });

  it('creates resource when PUT to resource path without linkRel header.', async(): Promise<void> => {
    // Mock the fs functions.
    (fsPromises.lstat as jest.Mock).mockImplementationOnce((): any => {
      throw new Error('Path does not exist.');
    });
    (fsPromises.mkdir as jest.Mock).mockReturnValue(true);
    stats.isDirectory = (): any => true;
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);

    // Tests
    (representation as any).metadata = { raw: []};
    await store.setRepresentation({ path: `${base}file.txt` }, representation);
    expect(fs.createWriteStream as jest.Mock).toBeCalledTimes(1);
  });

  it('creates container when POST to existing container path ending without slash and slug without slash.',
    async(): Promise<void> => {
      // Mock the fs functions.
      (fsPromises.access as jest.Mock).mockImplementationOnce((): any => {
        throw new Error('Path does not exist.');
      });
      stats.isDirectory = (): any => true;
      (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
      (fsPromises.mkdir as jest.Mock).mockReturnValue(true);

      // Tests
      (representation as any).metadata = { linkRel: { type: new Set() }, slug: 'bar', raw: []};
      (representation as any).metadata.linkRel.type.add(LINK_TYPE_LDP_BC);
      const identifier = await store.addResource({ path: `${base}foo` }, representation);
      expect(identifier.path).toBe(`${base}foo/bar/`);
    });
});
