import type { Stats, WriteStream } from 'fs';
import fs, { promises as fsPromises } from 'fs';
import { posix } from 'path';
import { Readable } from 'stream';
import { literal, namedNode, quad as quadRDF } from '@rdfjs/data-model';
import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'n3';
import streamifyArray from 'streamify-array';
import type { Representation } from '../../../src/ldp/representation/Representation';
import { RepresentationMetadata } from '../../../src/ldp/representation/RepresentationMetadata';
import { ExtensionBasedMapper } from '../../../src/storage/ExtensionBasedMapper';
import { FileResourceStore } from '../../../src/storage/FileResourceStore';
import { INTERNAL_QUADS } from '../../../src/util/ContentTypes';
import { ConflictHttpError } from '../../../src/util/errors/ConflictHttpError';
import { MethodNotAllowedHttpError } from '../../../src/util/errors/MethodNotAllowedHttpError';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';
import { UnsupportedMediaTypeHttpError } from '../../../src/util/errors/UnsupportedMediaTypeHttpError';
import { InteractionController } from '../../../src/util/InteractionController';
import { MetadataController } from '../../../src/util/MetadataController';
import { DCTERMS, HTTP, LDP, POSIX, RDF, XSD } from '../../../src/util/UriConstants';

const { join: joinPath } = posix;

const base = 'http://test.com/';
const rootFilepath = '/Users/default/home/public/';

jest.mock('fs', (): any => ({
  createReadStream: jest.fn(),
  createWriteStream: jest.fn(),
  promises: {
    rmdir: jest.fn(),
    lstat: jest.fn(),
    readdir: jest.fn(),
    mkdir: jest.fn(),
    unlink: jest.fn(),
    access: jest.fn(),
  },
}));

describe('A FileResourceStore', (): void => {
  let store: FileResourceStore;
  let representation: Representation;
  let readableMock: Readable;
  let stats: Stats;
  let writeStream: WriteStream;
  const rawData = 'lorem ipsum dolor sit amet consectetur adipiscing';

  beforeEach(async(): Promise<void> => {
    jest.clearAllMocks();
    fs.promises = {
      rmdir: jest.fn(),
      lstat: jest.fn(),
      readdir: jest.fn(),
      mkdir: jest.fn(),
      unlink: jest.fn(),
      access: jest.fn(),
    } as any;

    store = new FileResourceStore(
      new ExtensionBasedMapper(base, rootFilepath),
      new InteractionController(),
      new MetadataController(),
    );

    representation = {
      binary: true,
      data: streamifyArray([ rawData ]),
      metadata: new RepresentationMetadata(),
    };

    stats = {
      isDirectory: jest.fn((): any => false) as any,
      isFile: jest.fn((): any => false) as any,
      mtime: new Date(),
      size: 5,
    } as jest.Mocked<Stats>;

    writeStream = {
      on: jest.fn((name: string, func: () => void): any => {
        if (name === 'finish') {
          func();
        }
        return writeStream;
      }) as any,
      once: jest.fn((): any => writeStream) as any,
      emit: jest.fn((): any => true) as any,
      write: jest.fn((): any => true) as any,
      end: jest.fn() as any,
    } as jest.Mocked<WriteStream>;
    (fs.createWriteStream as jest.Mock).mockReturnValue(writeStream);

    readableMock = {
      on: jest.fn((name: string, func: () => void): any => {
        if (name === 'finish') {
          func();
        }
        return readableMock;
      }) as any,
      pipe: jest.fn((): any => readableMock) as any,
    } as jest.Mocked<Readable>;
  });

  it('errors if a resource was not found.', async(): Promise<void> => {
    (fsPromises.lstat as jest.Mock).mockImplementation((): any => {
      throw new Error('Path does not exist.');
    });
    (fsPromises.readdir as jest.Mock).mockImplementation((): any => []);
    await expect(store.getRepresentation({ path: 'http://wrong.com/wrong' })).rejects.toThrow(NotFoundHttpError);
    await expect(store.getRepresentation({ path: `${base}wrong` })).rejects.toThrow(NotFoundHttpError);
    await expect(store.getRepresentation({ path: `${base}wrong/` })).rejects.toThrow(NotFoundHttpError);
    await expect(store.addResource({ path: 'http://wrong.com/wrong' }, representation))
      .rejects.toThrow(NotFoundHttpError);
    await expect(store.deleteResource({ path: 'wrong' })).rejects.toThrow(NotFoundHttpError);
    await expect(store.deleteResource({ path: `${base}wrong` })).rejects.toThrow(NotFoundHttpError);
    await expect(store.deleteResource({ path: `${base}wrong/` })).rejects.toThrow(NotFoundHttpError);
    await expect(store.setRepresentation({ path: 'http://wrong.com/' }, representation))
      .rejects.toThrow(NotFoundHttpError);
  });

  it('errors when modifying resources.', async(): Promise<void> => {
    await expect(store.modifyResource()).rejects.toThrow(Error);
  });

  it('errors for wrong input data types.', async(): Promise<void> => {
    (representation as any).binary = false;
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
    representation.metadata.add(RDF.type, LDP.BasicContainer);
    representation.metadata.add(HTTP.slug, 'myContainer/');
    const identifier = await store.addResource({ path: base }, representation);
    expect(fsPromises.mkdir as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'myContainer/'), { recursive: true });
    expect(identifier.path).toBe(`${base}myContainer/`);

    // Read container
    const result = await store.getRepresentation(identifier);
    expect(result).toEqual({
      binary: false,
      data: expect.any(Readable),
      metadata: expect.any(RepresentationMetadata),
    });
    expect(result.metadata.get(DCTERMS.modified)?.value).toEqual(stats.mtime.toISOString());
    expect(result.metadata.contentType).toEqual(INTERNAL_QUADS);
    await expect(arrayifyStream(result.data)).resolves.toBeDefined();
  });

  it('errors for container creation with path to non container.', async(): Promise<void> => {
    // Mock the fs functions.
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    (fsPromises.readdir as jest.Mock).mockReturnValue([ 'foo' ]);

    // Tests
    representation.metadata.add(RDF.type, LDP.BasicContainer);
    representation.metadata.add(HTTP.slug, 'myContainer/');
    await expect(store.addResource({ path: `${base}foo` }, representation)).rejects.toThrow(MethodNotAllowedHttpError);
    expect(fsPromises.lstat as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'foo'));
  });

  it('errors 404 for POST invalid path ending without slash and 405 for valid.', async(): Promise<void> => {
    // Mock the fs functions.
    (fsPromises.readdir as jest.Mock).mockReturnValue([]);

    // Tests
    representation.metadata.add(RDF.type, LDP.BasicContainer);
    representation.metadata.add(HTTP.slug, 'myContainer/');
    await expect(store.addResource({ path: `${base}doesnotexist` }, representation))
      .rejects.toThrow(NotFoundHttpError);
    expect(fsPromises.readdir as jest.Mock).toHaveBeenLastCalledWith(rootFilepath);

    representation.metadata.set(RDF.type, LDP.Resource);
    representation.metadata.set(HTTP.slug, 'file.txt');
    await expect(store.addResource({ path: `${base}doesnotexist` }, representation))
      .rejects.toThrow(NotFoundHttpError);
    expect(fsPromises.readdir as jest.Mock).toHaveBeenLastCalledWith(rootFilepath);

    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    (fsPromises.readdir as jest.Mock).mockReturnValue([ 'existingresource' ]);
    representation.metadata.removeAll(RDF.type);
    await expect(store.addResource({ path: `${base}existingresource` }, representation))
      .rejects.toThrow(MethodNotAllowedHttpError);
    expect(fsPromises.lstat as jest.Mock).toHaveBeenLastCalledWith(joinPath(rootFilepath, 'existingresource'));

    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    (fsPromises.mkdir as jest.Mock).mockImplementation((): void => {
      throw new Error('not a directory');
    });
    representation.metadata.removeAll(RDF.type);
    await expect(store.addResource({ path: `${base}existingresource/container/` }, representation))
      .rejects.toThrow(MethodNotAllowedHttpError);
    expect(fsPromises.lstat as jest.Mock)
      .toHaveBeenLastCalledWith(joinPath(rootFilepath, 'existingresource'));
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
    (fsPromises.readdir as jest.Mock).mockReturnValueOnce([ 'file.txt' ]);
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    (fs.createReadStream as jest.Mock).mockReturnValueOnce(streamifyArray([ rawData ]));
    (fs.createReadStream as jest.Mock).mockReturnValueOnce(streamifyArray([]));

    // Tests
    await store.setRepresentation({ path: `${base}file.txt` }, representation);
    expect(fs.createWriteStream as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'file.txt'));
    const result = await store.getRepresentation({ path: `${base}file.txt` });
    expect(result).toEqual({
      binary: true,
      data: expect.any(Readable),
      metadata: expect.any(RepresentationMetadata),
    });
    expect(result.metadata.get(DCTERMS.modified)?.value).toEqual(stats.mtime.toISOString());
    expect(result.metadata.get(POSIX.size)?.value).toEqual(`${stats.size}`);
    expect(result.metadata.contentType).toEqual('text/plain');
    await expect(arrayifyStream(result.data)).resolves.toEqual([ rawData ]);
    expect(fsPromises.lstat as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'file.txt'));
    expect(fs.createReadStream as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'file.txt'));
    expect(fs.createReadStream as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'file.txt.metadata'));
  });

  it('can delete data.', async(): Promise<void> => {
    // Mock the fs functions.
    // Delete
    (fsPromises.readdir as jest.Mock).mockReturnValueOnce([ 'file.txt' ]);
    stats.isFile = jest.fn((): any => true);
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    (fsPromises.unlink as jest.Mock).mockReturnValueOnce(true);
    (fsPromises.unlink as jest.Mock).mockImplementationOnce((): any => {
      throw new Error('Metadata file does not exist.');
    });

    // Mock: Get
    (fsPromises.readdir as jest.Mock).mockReturnValueOnce([ ]);
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
    representation.metadata.add(RDF.type, LDP.Resource);
    representation.metadata.add(HTTP.slug, 'file.txt');
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
    representation.metadata.add(RDF.type, LDP.Resource);
    representation.data = readableMock;
    await store.addResource({ path: `${base}foo/` }, representation);
    expect(fsPromises.mkdir as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'foo/'), { recursive: true });
    expect(fsPromises.lstat as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'foo/'));

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
    (fsPromises.readdir as jest.Mock).mockReturnValue([ '14' ]);

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
      quadRDF(containerNode, namedNode(RDF.type), namedNode(LDP.Container)),
      quadRDF(containerNode, namedNode(RDF.type), namedNode(LDP.BasicContainer)),
      quadRDF(containerNode, namedNode(RDF.type), namedNode(LDP.Resource)),
      quadRDF(containerNode, namedNode(POSIX.size), DataFactory.literal(stats.size)),
      quadRDF(containerNode, namedNode(DCTERMS.modified), literal(stats.mtime.toISOString(), namedNode(XSD.dateTime))),
      quadRDF(containerNode, namedNode(POSIX.mtime), DataFactory.literal(Math.floor(stats.mtime.getTime() / 1000))),
      quadRDF(containerNode, namedNode(LDP.contains), fileNode),
      quadRDF(fileNode, namedNode(RDF.type), namedNode(LDP.Resource)),
      quadRDF(fileNode, namedNode(POSIX.size), DataFactory.literal(stats.size)),
      quadRDF(fileNode, namedNode(DCTERMS.modified), literal(stats.mtime.toISOString(), namedNode(XSD.dateTime))),
      quadRDF(fileNode, namedNode(POSIX.mtime), DataFactory.literal(Math.floor(stats.mtime.getTime() / 1000))),
    ];
    const result = await store.getRepresentation({ path: `${base}foo/` });
    expect(result).toEqual({
      binary: false,
      data: expect.any(Readable),
      metadata: expect.any(RepresentationMetadata),
    });
    expect(result.metadata.get(DCTERMS.modified)?.value).toEqual(stats.mtime.toISOString());
    expect(result.metadata.contentType).toEqual(INTERNAL_QUADS);
    await expect(arrayifyStream(result.data)).resolves.toBeRdfIsomorphic(quads);
    expect(fsPromises.lstat as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'foo/'));
    expect(fsPromises.readdir as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'foo/'));
    expect(fsPromises.lstat as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'foo', 'file.txt'));
    expect(fsPromises.lstat as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'foo', '.nonresource'));
  });

  it('can overwrite representation and its metadata with PUT.', async(): Promise<void> => {
    // Mock the fs functions.
    stats.isFile = jest.fn((): any => true);
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    (fsPromises.mkdir as jest.Mock).mockReturnValueOnce(true);
    stats = { ...stats };
    stats.isDirectory = jest.fn((): any => true);
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);

    // Tests
    representation.metadata.add(RDF.type, LDP.Resource);
    await store.setRepresentation({ path: `${base}alreadyexists.txt` }, representation);
    expect(fs.createWriteStream as jest.Mock).toBeCalledTimes(2);
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
    representation.metadata.add(RDF.type, LDP.BasicContainer);
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
    representation.metadata.add(RDF.type, LDP.BasicContainer);
    await store.setRepresentation({ path: `${base}foo/` }, representation);
    expect(fsPromises.mkdir as jest.Mock).toBeCalledTimes(1);
    expect(fsPromises.access as jest.Mock).toBeCalledTimes(1);
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
    representation.metadata.add(RDF.type, LDP.Resource);
    representation.metadata.add(HTTP.slug, 'file.txt');
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
    representation.metadata.add(RDF.type, LDP.BasicContainer);
    representation.metadata.add(HTTP.slug, 'foo/');
    await expect(store.addResource({ path: base }, representation)).rejects.toThrow(Error);
    expect(fsPromises.rmdir as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'foo/'));
  });

  it('creates container when POSTing without linkRel and with slug ending with slash.', async(): Promise<void> => {
    // Mock the fs functions.
    // Add
    (fsPromises.mkdir as jest.Mock).mockReturnValueOnce(true);

    // Tests
    representation.metadata.add(HTTP.slug, 'myContainer/');
    const identifier = await store.addResource({ path: base }, representation);
    expect(identifier.path).toBe(`${base}myContainer/`);
    expect(fsPromises.mkdir as jest.Mock).toBeCalledTimes(1);
    expect(fsPromises.mkdir as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'myContainer/'), { recursive: true });
  });

  it('returns default contentType when unknown for representation.', async(): Promise<void> => {
    // Mock the fs functions.
    stats.isFile = jest.fn((): any => true);
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    (fs.createReadStream as jest.Mock).mockReturnValueOnce(streamifyArray([ rawData ]));
    (fs.createReadStream as jest.Mock).mockImplementationOnce((): any => new Error('Metadata file does not exist.'));
    (fsPromises.readdir as jest.Mock).mockReturnValueOnce([ '.htaccess' ]);

    const result = await store.getRepresentation({ path: `${base}.htaccess` });
    expect(result).toEqual({
      binary: true,
      data: expect.any(Readable),
      metadata: expect.any(RepresentationMetadata),
    });
    expect(result.metadata.contentType).toEqual('application/octet-stream');
    expect(result.metadata.get(DCTERMS.modified)?.value).toEqual(stats.mtime.toISOString());
    expect(result.metadata.get(POSIX.size)?.value).toEqual(`${stats.size}`);
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
      (fsPromises.readdir as jest.Mock).mockReturnValueOnce([ 'foo' ]);

      // Tests
      representation.metadata.add(RDF.type, LDP.BasicContainer);
      representation.metadata.add(HTTP.slug, 'bar');
      const identifier = await store.addResource({ path: `${base}foo` }, representation);
      expect(identifier.path).toBe(`${base}foo/bar/`);
      expect(fsPromises.lstat as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'foo'));
      expect(fsPromises.mkdir as jest.Mock).toBeCalledWith(joinPath(rootFilepath, 'foo', 'bar/'), { recursive: false });
    });

  it('generates a new URI when adding without a slug.', async(): Promise<void> => {
    // Mock the fs functions.
    // Post
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    (fsPromises.mkdir as jest.Mock).mockReturnValue(true);
    stats.isDirectory = jest.fn((): any => true);
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);

    // Mock: Get
    stats.isFile = jest.fn((): any => true);
    (fsPromises.lstat as jest.Mock).mockReturnValueOnce(stats);
    (fs.createReadStream as jest.Mock).mockReturnValueOnce(streamifyArray([ rawData ]));
    (fs.createReadStream as jest.Mock).mockImplementationOnce((): any => new Error('Metadata file does not exist.'));

    // Tests
    await store.addResource({ path: base }, representation);
    const filePath: string = (fs.createWriteStream as jest.Mock).mock.calls[0][0];
    expect(filePath.startsWith(rootFilepath)).toBeTruthy();
    const name = filePath.slice(rootFilepath.length);

    (fsPromises.readdir as jest.Mock).mockReturnValueOnce([ name ]);
    const result = await store.getRepresentation({ path: `${base}${name}` });
    expect(result).toEqual({
      binary: true,
      data: expect.any(Readable),
      metadata: expect.any(RepresentationMetadata),
    });
    expect(result.metadata.get(DCTERMS.modified)?.value).toEqual(stats.mtime.toISOString());
    expect(result.metadata.get(POSIX.size)?.value).toEqual(`${stats.size}`);
    await expect(arrayifyStream(result.data)).resolves.toEqual([ rawData ]);
    expect(fsPromises.lstat as jest.Mock).toBeCalledWith(joinPath(rootFilepath, name));
    expect(fs.createReadStream as jest.Mock).toBeCalledWith(joinPath(rootFilepath, name));
    expect(fs.createReadStream as jest.Mock).toBeCalledWith(joinPath(rootFilepath, `${name}.metadata`));
  });
});
