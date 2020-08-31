import fs, { promises as fsPromises, Stats, WriteStream } from 'fs';
import { posix } from 'path';
import { Readable } from 'stream';
import { literal, namedNode, quad as quadRDF, triple } from '@rdfjs/data-model';
import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'n3';
import streamifyArray from 'streamify-array';
import { RuntimeConfig } from '../../../src/init/RuntimeConfig';
import { BinaryRepresentation } from '../../../src/ldp/representation/BinaryRepresentation';
import { RepresentationMetadata } from '../../../src/ldp/representation/RepresentationMetadata';
import { FileResourceStore } from '../../../src/storage/FileResourceStore';
import { CONTENT_TYPE_QUADS, DATA_TYPE_BINARY, DATA_TYPE_QUAD } from '../../../src/util/ContentTypes';
import { ConflictHttpError } from '../../../src/util/errors/ConflictHttpError';
import { MethodNotAllowedHttpError } from '../../../src/util/errors/MethodNotAllowedHttpError';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';
import { UnsupportedMediaTypeHttpError } from '../../../src/util/errors/UnsupportedMediaTypeHttpError';
import { InteractionController } from '../../../src/util/InteractionController';
import { LINK_TYPE_LDP_BC, LINK_TYPE_LDPR } from '../../../src/util/LinkTypes';
import { MetadataController } from '../../../src/util/MetadataController';
import { LDP, RDF, STAT, TERMS, XML } from '../../../src/util/Prefixes';

const { join: joinPath } = posix;

const base = 'http://test.com/';
const rootFilepath = '/Users/default/home/public/';

fsPromises.rmdir = jest.fn();
fsPromises.lstat = jest.fn();
fsPromises.readdir = jest.fn();
fsPromises.mkdir = jest.fn();
fsPromises.unlink = jest.fn();
fsPromises.access = jest.fn();

describe('A FileResourceStore', (): void => {
  let store: FileResourceStore;
  let representation: BinaryRepresentation;
  let readableMock: Readable;
  let stats: Stats;
  let writeStream: WriteStream;
  const rawData = 'lorem ipsum dolor sit amet consectetur adipiscing';
  const quad = triple(
    namedNode('http://test.com/s'),
    namedNode('http://test.com/p'),
    namedNode('http://test.com/o'),
  );

  fs.createReadStream = jest.fn();

  beforeEach(async(): Promise<void> => {
    jest.clearAllMocks();

    store = new FileResourceStore(
      new RuntimeConfig({ base, rootFilepath }),
      new InteractionController(),
      new MetadataController(),
    );

    representation = {
      data: streamifyArray([ rawData ]),
      dataType: DATA_TYPE_BINARY,
      metadata: { raw: [], linkRel: { type: new Set() }} as RepresentationMetadata,
    };

    stats = {
      isDirectory: jest.fn((): any => false) as Function,
      isFile: jest.fn((): any => false) as Function,
      mtime: new Date(),
    } as jest.Mocked<Stats>;

    // Mock the fs functions for the createDataFile function.
    fs.createWriteStream = jest.fn();
    writeStream = {
      on: jest.fn((name: string, func: () => void): any => {
        if (name === 'finish') {
          func();
        }
        return writeStream;
      }) as Function,
      once: jest.fn((): any => writeStream) as Function,
      emit: jest.fn((): any => true) as Function,
      write: jest.fn((): any => true) as Function,
      end: jest.fn() as Function,
    } as jest.Mocked<WriteStream>;
    (fs.createWriteStream as jest.Mock).mockReturnValue(writeStream);

    readableMock = {
      on: jest.fn((name: string, func: () => void): any => {
        if (name === 'finish') {
          func();
        }
        return readableMock;
      }) as Function,
      pipe: jest.fn((): any => readableMock) as Function,
    } as jest.Mocked<Readable>;
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
    stats.isDirectory = jest.fn((): any => true);
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    (fsPromises.readdir as jest.Mock).mockReturnValueOnce([]);
    (fs.createReadStream as jest.Mock).mockImplementationOnce((): any => new Error('Metadata file does not exist.'));

    // Write container (POST)
    representation.metadata = { linkRel: { type: new Set([ LINK_TYPE_LDP_BC ]) }, slug: 'myContainer/', raw: []};
    const identifier = await store.addResource({ path: base }, representation);
    expect(fsPromises.mkdir as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'myContainer/'), { recursive: true });
    expect(identifier.path).toBe(`${base}myContainer/`);

    // Read container
    const result = await store.getRepresentation(identifier);
    expect(result).toEqual({
      dataType: DATA_TYPE_QUAD,
      data: expect.any(Readable),
      metadata: {
        raw: [],
        dateTime: stats.mtime,
        contentType: CONTENT_TYPE_QUADS,
      },
    });
    await expect(arrayifyStream(result.data)).resolves.toBeDefined();
  });

  it('errors for container creation with path to non container.', async(): Promise<void> => {
    // Mock the fs functions.
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);

    // Tests
    representation.metadata = { linkRel: { type: new Set([ LINK_TYPE_LDP_BC ]) }, slug: 'myContainer/', raw: []};
    await expect(store.addResource({ path: `${base}foo` }, representation)).rejects.toThrow(MethodNotAllowedHttpError);
    expect(fsPromises.lstat as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'foo'));
  });

  it('errors 405 for POST invalid path ending without slash.', async(): Promise<void> => {
    // Mock the fs functions.
    (fsPromises.lstat as jest.Mock).mockImplementationOnce((): any => {
      throw new Error('Path does not exist.');
    });
    (fsPromises.lstat as jest.Mock).mockImplementationOnce((): any => {
      throw new Error('Path does not exist.');
    });
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);

    // Tests
    representation.metadata = { linkRel: { type: new Set([ LINK_TYPE_LDP_BC ]) }, slug: 'myContainer/', raw: []};
    await expect(store.addResource({ path: `${base}doesnotexist` }, representation))
      .rejects.toThrow(MethodNotAllowedHttpError);
    expect(fsPromises.lstat as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'doesnotexist'));

    representation.metadata = { linkRel: { type: new Set([ LINK_TYPE_LDPR ]) }, slug: 'file.txt', raw: []};
    await expect(store.addResource({ path: `${base}doesnotexist` }, representation))
      .rejects.toThrow(MethodNotAllowedHttpError);
    expect(fsPromises.lstat as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'doesnotexist'));

    representation.metadata = { linkRel: { type: new Set() }, slug: 'file.txt', raw: []};
    await expect(store.addResource({ path: `${base}existingresource` }, representation))
      .rejects.toThrow(MethodNotAllowedHttpError);
    expect(fsPromises.lstat as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'existingresource'));
  });

  it('can set data.', async(): Promise<void> => {
    // Mock the fs functions.
    // Set
    (fsPromises.lstat as jest.Mock).mockImplementationOnce((): any => {
      throw new Error('Path does not exist.');
    });
    (fsPromises.mkdir as jest.Mock).mockReturnValue(true);
    stats.isDirectory = jest.fn((): any => true);
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);

    // Mock: Get
    stats = { ...stats };
    stats.isFile = jest.fn((): any => true);
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    (fs.createReadStream as jest.Mock).mockReturnValueOnce(streamifyArray([ rawData ]));
    (fs.createReadStream as jest.Mock).mockReturnValueOnce(streamifyArray([]));

    // Tests
    await store.setRepresentation({ path: `${base}file.txt` }, representation);
    expect(fs.createWriteStream as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'file.txt'));
    const result = await store.getRepresentation({ path: `${base}file.txt` });
    expect(result).toEqual({
      dataType: DATA_TYPE_BINARY,
      data: expect.any(Readable),
      metadata: {
        raw: [],
        dateTime: stats.mtime,
        byteSize: stats.size,
        contentType: 'text/plain; charset=utf-8',
      },
    });
    await expect(arrayifyStream(result.data)).resolves.toEqual([ rawData ]);
    expect(fsPromises.lstat as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'file.txt'));
    expect(fs.createReadStream as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'file.txt'));
    expect(fs.createReadStream as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'file.txt.metadata'));
  });

  it('can delete data.', async(): Promise<void> => {
    // Mock the fs functions.
    // Delete
    stats.isFile = jest.fn((): any => true);
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
    expect(fsPromises.unlink as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'file.txt'));
    await expect(store.getRepresentation({ path: `${base}file.txt` })).rejects.toThrow(NotFoundHttpError);
  });

  it('creates intermediate container when POSTing resource to path ending with slash.', async(): Promise<void> => {
    // Mock the fs functions.
    (fsPromises.mkdir as jest.Mock).mockReturnValueOnce(true);
    stats.isDirectory = jest.fn((): any => true);
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);

    // Tests
    representation.metadata = { linkRel: { type: new Set([ LINK_TYPE_LDPR ]) }, slug: 'file.txt', raw: []};
    const identifier = await store.addResource({ path: `${base}doesnotexistyet/` }, representation);
    expect(identifier.path).toBe(`${base}doesnotexistyet/file.txt`);
    expect(fsPromises.mkdir as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'doesnotexistyet/'),
      { recursive: true });
    expect(fsPromises.lstat as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'doesnotexistyet/'));
  });

  it('creates metadata file when metadata triples are passed.', async(): Promise<void> => {
    // Mock the fs functions.
    // Add
    (fsPromises.mkdir as jest.Mock).mockReturnValueOnce(true);
    stats.isDirectory = jest.fn((): any => true);
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);

    // Mock: Set
    (fsPromises.lstat as jest.Mock).mockImplementationOnce((): any => {
      throw new Error('Path does not exist.');
    });
    (fsPromises.mkdir as jest.Mock).mockReturnValueOnce(true);
    stats = { ...stats };
    stats.isDirectory = jest.fn((): any => true);
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);

    // Tests
    representation.metadata = { linkRel: { type: new Set([ LINK_TYPE_LDPR ]) }, raw: [ quad ]};
    representation.data = readableMock;
    await store.addResource({ path: `${base}foo/` }, representation);
    expect(fsPromises.mkdir as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'foo/'), { recursive: true });
    expect(fsPromises.lstat as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'foo/'));

    representation.metadata = { linkRel: { type: new Set([ LINK_TYPE_LDPR ]) }, raw: [ quad ]};
    await store.setRepresentation({ path: `${base}foo/file.txt` }, representation);
    expect(fs.createWriteStream as jest.Mock).toBeCalledTimes(4);
  });

  it('errors when deleting root container.', async(): Promise<void> => {
    // Tests
    await expect(store.deleteResource({ path: base })).rejects.toThrow(MethodNotAllowedHttpError);
  });

  it('errors when deleting non empty container.', async(): Promise<void> => {
    // Mock the fs functions.
    stats.isDirectory = jest.fn((): any => true);
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    (fsPromises.readdir as jest.Mock).mockReturnValueOnce([ '.metadata', 'file.txt' ]);

    // Tests
    await expect(store.deleteResource({ path: `${base}notempty/` })).rejects.toThrow(ConflictHttpError);
    expect(fsPromises.lstat as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'notempty/'));
    expect(fsPromises.readdir as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'notempty/'));
  });

  it('deletes metadata file when deleting container.', async(): Promise<void> => {
    // Mock the fs functions.
    stats.isDirectory = jest.fn((): any => true);
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    (fsPromises.readdir as jest.Mock).mockReturnValueOnce([ '.metadata' ]);
    (fsPromises.unlink as jest.Mock).mockReturnValueOnce(true);
    (fsPromises.rmdir as jest.Mock).mockReturnValueOnce(true);

    // Tests
    await store.deleteResource({ path: `${base}foo/` });
    expect(fsPromises.lstat as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'foo/'));
    expect(fsPromises.readdir as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'foo/'));
    expect(fsPromises.unlink as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'foo', '.metadata'));
    expect(fsPromises.rmdir as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'foo/'));
  });

  it('errors 404 when accessing non resource (file/directory), e.g. special files.', async(): Promise<void> => {
    // Mock the fs functions.
    (fsPromises.lstat as jest.Mock).mockReturnValue(stats);

    // Tests
    await expect(store.deleteResource({ path: `${base}dev/pts/14` })).rejects.toThrow(NotFoundHttpError);
    await expect(store.getRepresentation({ path: `${base}dev/pts/14` })).rejects.toThrow(NotFoundHttpError);
  });

  it('returns the quads of the files in a directory when a directory is queried.', async(): Promise<void> => {
    // Mock the fs functions.
    stats.isDirectory = jest.fn((): any => true);
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    (fsPromises.readdir as jest.Mock).mockReturnValueOnce([ 'file.txt', '.nonresource' ]);
    stats = { ...stats };
    stats.isFile = jest.fn((): any => true);
    stats.isDirectory = jest.fn((): any => false);
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    stats = { ...stats };
    stats.isFile = jest.fn((): any => false);
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
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
      quadRDF(fileNode, namedNode(`${STAT}size`), DataFactory.literal(stats.size)),
      quadRDF(fileNode, namedNode(`${TERMS}modified`), literal(stats.mtime.toUTCString(), `${XML}dateTime`)),
      quadRDF(fileNode, namedNode(`${STAT}mtime`), DataFactory.literal(stats.mtime.getTime() / 100)),
    ];
    const result = await store.getRepresentation({ path: `${base}foo/` });
    expect(result).toEqual({
      dataType: DATA_TYPE_QUAD,
      data: expect.any(Readable),
      metadata: {
        raw: [],
        dateTime: stats.mtime,
        contentType: CONTENT_TYPE_QUADS,
      },
    });
    await expect(arrayifyStream(result.data)).resolves.toEqualRdfQuadArray(quads);
    expect(fsPromises.lstat as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'foo/'));
    expect(fsPromises.readdir as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'foo/'));
    expect(fsPromises.lstat as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'foo', 'file.txt'));
    expect(fsPromises.lstat as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'foo', '.nonresource'));
  });

  it('can overwrite representation with PUT.', async(): Promise<void> => {
    // Mock the fs functions.
    stats.isFile = jest.fn((): any => true);
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    (fsPromises.mkdir as jest.Mock).mockReturnValueOnce(true);
    stats = { ...stats };
    stats.isDirectory = jest.fn((): any => true);
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);

    // Tests
    representation.metadata = { linkRel: { type: new Set([ LINK_TYPE_LDPR ]) }, raw: []};
    await store.setRepresentation({ path: `${base}alreadyexists.txt` }, representation);
    expect(fs.createWriteStream as jest.Mock).toBeCalledTimes(1);
    expect(fsPromises.lstat as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'alreadyexists.txt'));
    expect(fsPromises.mkdir as jest.Mock).toBeCalledWith(rootFilepath, { recursive: true });
  });

  it('errors when overwriting container with PUT.', async(): Promise<void> => {
    // Mock the fs functions.
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    (fsPromises.access as jest.Mock).mockReturnValueOnce(true);

    // Tests
    await expect(store.setRepresentation({ path: `${base}alreadyexists` }, representation)).rejects
      .toThrow(ConflictHttpError);
    expect(fsPromises.lstat as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'alreadyexists'));
    representation.metadata = { linkRel: { type: new Set([ LINK_TYPE_LDP_BC ]) }, raw: []};
    await expect(store.setRepresentation({ path: `${base}alreadyexists/` }, representation)).rejects
      .toThrow(ConflictHttpError);
    expect(fsPromises.access as jest.Mock).toBeCalledTimes(1);
  });

  it('can create a container with PUT.', async(): Promise<void> => {
    // Mock the fs functions.
    (fsPromises.access as jest.Mock).mockImplementationOnce((): any => {
      throw new Error('Path does not exist.');
    });
    (fsPromises.mkdir as jest.Mock).mockReturnValueOnce(true);

    // Tests
    representation.metadata = { linkRel: { type: new Set([ LINK_TYPE_LDP_BC ]) }, raw: []};
    await store.setRepresentation({ path: `${base}foo/` }, representation);
    expect(fsPromises.mkdir as jest.Mock).toBeCalledTimes(1);
    expect(fsPromises.access as jest.Mock).toBeCalledTimes(1);
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
    stats.isDirectory = jest.fn((): any => true);
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    (fs.createWriteStream as jest.Mock).mockReturnValueOnce(writeStream);
    (fs.createWriteStream as jest.Mock).mockImplementationOnce((): any => {
      throw new Error('Failed to create new file.');
    });
    (fsPromises.unlink as jest.Mock).mockReturnValueOnce(true);

    // Tests
    representation.metadata = { linkRel: { type: new Set([ LINK_TYPE_LDPR ]) }, slug: 'file.txt', raw: [ quad ]};
    await expect(store.addResource({ path: base }, representation)).rejects.toThrow(Error);
    expect(fs.createWriteStream as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'file.txt.metadata'));
    expect(fs.createWriteStream as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'file.txt'));
    expect(fsPromises.unlink as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'file.txt.metadata'));
  });

  it('undoes container creation when metadata file creation fails.', async(): Promise<void> => {
    // Mock the fs functions.
    (fsPromises.mkdir as jest.Mock).mockReturnValueOnce(true);
    (fs.createWriteStream as jest.Mock).mockImplementationOnce((): any => {
      throw new Error('Failed to create new file.');
    });
    (fsPromises.rmdir as jest.Mock).mockReturnValueOnce(true);

    // Tests
    representation.metadata = { linkRel: { type: new Set([ LINK_TYPE_LDP_BC ]) }, slug: 'foo/', raw: [ quad ]};
    await expect(store.addResource({ path: base }, representation)).rejects.toThrow(Error);
    expect(fsPromises.rmdir as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'foo/'));
  });

  it('creates container when POSTing without linkRel and with slug ending with slash.', async(): Promise<void> => {
    // Mock the fs functions.
    // Add
    (fsPromises.mkdir as jest.Mock).mockReturnValueOnce(true);

    // Tests
    representation.metadata = { slug: 'myContainer/', raw: []};
    const identifier = await store.addResource({ path: base }, representation);
    expect(identifier.path).toBe(`${base}myContainer/`);
    expect(fsPromises.mkdir as jest.Mock).toBeCalledTimes(1);
    expect(fsPromises.mkdir as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'myContainer/'), { recursive: true });
  });

  it('returns no contentType when unknown for representation.', async(): Promise<void> => {
    // Mock the fs functions.
    stats.isFile = jest.fn((): any => true);
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    (fs.createReadStream as jest.Mock).mockReturnValueOnce(streamifyArray([ rawData ]));
    (fs.createReadStream as jest.Mock).mockReturnValueOnce(new Readable()
      .destroy(new Error('Metadata file does not exist.')));

    const result = await store.getRepresentation({ path: `${base}.htaccess` });
    expect(result).toEqual({
      dataType: DATA_TYPE_BINARY,
      data: expect.any(Readable),
      metadata: {
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
    stats.isDirectory = jest.fn((): any => true);
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);

    // Tests
    representation.metadata = { raw: []};
    await store.setRepresentation({ path: `${base}file.txt` }, representation);
    expect(fsPromises.mkdir as jest.Mock).toBeCalledWith(rootFilepath, { recursive: true });
    expect(fs.createWriteStream as jest.Mock).toBeCalledTimes(1);
    expect(fs.createWriteStream as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'file.txt'));
  });

  it('creates container when POST to existing container path ending without slash and slug without slash.',
    async(): Promise<void> => {
      // Mock the fs functions.
      stats.isDirectory = jest.fn((): any => true);
      (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
      (fsPromises.mkdir as jest.Mock).mockReturnValue(true);

      // Tests
      representation.metadata = { linkRel: { type: new Set([ LINK_TYPE_LDP_BC ]) }, slug: 'bar', raw: []};
      const identifier = await store.addResource({ path: `${base}foo` }, representation);
      expect(identifier.path).toBe(`${base}foo/bar/`);
      expect(fsPromises.lstat as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'foo'));
      expect(fsPromises.mkdir as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'foo', 'bar/'), { recursive: false });
    });
});
