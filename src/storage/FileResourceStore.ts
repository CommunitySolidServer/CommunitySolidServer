import arrayifyStream from 'arrayify-stream';
import { ConflictHttpError } from '../util/errors/ConflictHttpError';
import { contentType } from 'mime-types';
import { DATA_TYPE_BINARY } from '../util/ContentTypes';
import { ensureTrailingSlash } from '../util/Util';
import { InternalServerError } from '../util/errors/InternalServerError';
import { MethodNotAllowedHttpError } from '../util/errors/MethodNotAllowedHttpError';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import { Readable } from 'stream';
import { Representation } from '../ldp/representation/Representation';
import { RepresentationMetadata } from '../ldp/representation/RepresentationMetadata';
import { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { ResourceStore } from './ResourceStore';
import streamifyArray from 'streamify-array';
import { UnsupportedMediaTypeHttpError } from '../util/errors/UnsupportedMediaTypeHttpError';
import { createReadStream, createWriteStream, promises as fsPromises, Stats } from 'fs';
import { DataFactory, StreamWriter } from 'n3';
import { InteractionHandler, RequestAction } from '../util/InteractionHandler';
import { NamedNode, Quad } from 'rdf-js';

/**
 * Resource store storing its data in the file system backend.
 * All requests will throw an {@link NotFoundHttpError} if unknown identifiers get passed.
 */
export class FileResourceStore implements ResourceStore {
  private readonly base: string;
  private readonly root: string;
  private readonly interactionHandler: InteractionHandler;

  private readonly rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
  private readonly ldp = 'http://www.w3.org/ns/ldp#';
  private readonly terms = 'http://purl.org/dc/terms/';
  private readonly xml = 'http://www.w3.org/2001/XMLSchema#';
  private readonly stat = 'http://www.w3.org/ns/posix/stat#';

  private readonly predicates = {
    aType: DataFactory.namedNode(`${this.rdf}type`),
    modified: DataFactory.namedNode(`${this.terms}modified`),
    contains: DataFactory.namedNode(`${this.ldp}contains`),
    mtime: DataFactory.namedNode(`${this.stat}mtime`),
    size: DataFactory.namedNode(`${this.stat}size`),
  };

  private readonly objects = {
    container: DataFactory.namedNode(`${this.ldp}Container`),
    basicContainer: DataFactory.namedNode(`${this.ldp}BasicContainer`),
    ldpResource: DataFactory.namedNode(`${this.ldp}Resource`),
    dateTime: DataFactory.namedNode(`${this.xml}dateTime`),
  };

  /**
   * @param base - Will be stripped of all incoming URIs and added to all outgoing ones to find the relative path.
   * @param root - Root filepath in which the resources and containers will be saved as files and directories.
   */
  public constructor(base: string, root: string) {
    this.base = base;
    while (this.base.endsWith('/')) {
      this.base = this.base.slice(0, -1);
    }

    this.root = root;
    while (this.root.endsWith('/')) {
      this.root = this.root.slice(0, -1);
    }

    this.interactionHandler = new InteractionHandler();
  }

  /**
   * Store the incoming data as a file under a file path corresponding to `container.path`,
   * where slashes correspond to subdirectories.
   * @param container - The identifier to store the new data under.
   * @param representation - Data to store. Only File streams are supported.
   *
   * @returns The newly generated identifier.
   */
  public async addResource(container: ResourceIdentifier, representation: Representation): Promise<ResourceIdentifier> {
    if (representation.dataType !== DATA_TYPE_BINARY) {
      throw new UnsupportedMediaTypeHttpError('FileResourceStore only supports binary representations.');
    }
    const path = this.parseIdentifier(container);
    const { slug, linkType, raw } = representation.metadata;
    let metadata;
    if (raw && raw.length > 0) {
      metadata = streamifyArray(raw);
    }

    const resultingAction = this.interactionHandler.getResultingAction(path, slug, linkType);
    if (resultingAction.requestAction === RequestAction.CREATE_RESOURCE) {
      // Create a file for the resource with as filepath the parent container.
      return this.createFile(`${this.root}${resultingAction.parentContainer}`,
        resultingAction.newIdentifier,
        representation.data,
        path.endsWith('/'),
        metadata);
    }

    // Create a new container as subdirectory of the parent container.
    return this.createContainer(`${this.root}${resultingAction.parentContainer}`,
      resultingAction.newIdentifier,
      path.endsWith('/'),
      metadata);
  }

  public async deleteResource(identifier: ResourceIdentifier): Promise<void> {
    let path = this.parseIdentifier(identifier);
    if (path === '' || ensureTrailingSlash(path) === '/') {
      throw new MethodNotAllowedHttpError('Cannot delete root container.');
    }
    path = `${this.root}${path}`;
    return new Promise(async(resolve, reject): Promise<any> => {
      try {
        const stats = await fsPromises.lstat(path);
        if (stats.isFile()) {
          await fsPromises.unlink(path);
          try {
            await fsPromises.unlink(`${path}.metadata`);
          } catch (_) {
            // It's ok if there was no metadata file.
          }
          resolve();
        } else if (stats.isDirectory()) {
          path = ensureTrailingSlash(path);
          const files = await fsPromises.readdir(path);
          let match = files.find((file): any => !file.startsWith('.'));
          if (match !== undefined) {
            reject(new ConflictHttpError('Container is not empty.'));
          }

          match = files.find((file): any => file.startsWith('.'));
          while (match) {
            await fsPromises.unlink(`${path}${match}`);
            const matchedFile = match;
            files.filter((file): any => file !== matchedFile);
            match = files.find((file): any => file.startsWith('.'));
          }

          await fsPromises.rmdir(path);
          resolve();
        } else {
          reject(new NotFoundHttpError());
        }
      } catch (error) {
        reject(new NotFoundHttpError());
      }
    });
  }

  /**
   * Returns the stored representation for the given identifier.
   * No preferences are supported.
   * @param identifier - Identifier to retrieve.
   *
   * @returns The corresponding Representation.
   */
  public async getRepresentation(identifier: ResourceIdentifier): Promise<Representation> {
    let path = `${this.root}${this.parseIdentifier(identifier)}`;
    return new Promise(async(resolve, reject): Promise<any> => {
      try {
        const stats = await fsPromises.lstat(path);
        if (stats.isFile()) {
          const readStream = createReadStream(path);
          const _contentType = contentType(path);
          let rawMetadata: Quad[] = [];
          try {
            const readMetadataStream = createReadStream(`${path}.metadata`);
            rawMetadata = await arrayifyStream(readMetadataStream);
          } catch (_) {
            // Metadata file doesn't exist so lets keep `rawMetaData` an empty array.
          }
          const metadata: RepresentationMetadata = {
            raw: rawMetadata,
            profiles: [],
            dateTime: stats.mtime,
            byteSize: stats.size,
          };
          if (_contentType && _contentType !== path) {
            metadata.contentType = _contentType;
          }
          resolve({ metadata, data: readStream, dataType: DATA_TYPE_BINARY });
        } else if (stats.isDirectory()) {
          path = ensureTrailingSlash(path);
          const files = await fsPromises.readdir(path);
          const quads: Quad[] = [];

          const containerSubj: NamedNode = DataFactory.namedNode(path);

          quads.push(...this.generateResourceQuads(containerSubj, stats));

          for (const childName of files) {
            try {
              const childSubj: NamedNode = DataFactory.namedNode(`${path}${childName}`);
              const childStats = await fsPromises.lstat(path + childName);
              if (!childStats.isFile() && !childStats.isDirectory()) {
                continue;
              }

              quads.push(DataFactory.quad(containerSubj, this.predicates.contains, childSubj));
              quads.push(...this.generateResourceQuads(childSubj, childStats));
            } catch (_) {
              // Skip the child if there is an error.
            }
          }
          let rawMetadata: Quad[] = [];
          try {
            const readMetadataStream = createReadStream(`${path}.metadata`);
            rawMetadata = await arrayifyStream(readMetadataStream);
          } catch (_) {
            // Metadata file doesn't exist so lets keep `rawMetaData` an empty array.
          }
          return {
            dataType: DATA_TYPE_BINARY,
            data: streamifyArray(quads).pipe(new StreamWriter({ format: 'text/turtle' })),
            metadata: {
              raw: rawMetadata,
              profiles: [],
              contentType: 'text/turtle',
              dateTime: stats.mtime,
            },
          };
        } else {
          reject(new ConflictHttpError('Not a valid resource.'));
        }
      } catch (error) {
        reject(new NotFoundHttpError());
      }
    });
  }

  /**
   * @throws Not supported.
   */
  public async modifyResource(): Promise<void> {
    throw new Error('Not supported.');
  }

  /**
   * Replaces the stored Representation with the new one for the given identifier.
   * @param identifier - Identifier to replace.
   * @param representation - New Representation.
   */
  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation): Promise<void> {
    if (representation.dataType !== DATA_TYPE_BINARY) {
      throw new UnsupportedMediaTypeHttpError('FileResourceStore only supports binary representations.');
    }
    const _path = this.parseIdentifier(identifier);
    const { linkType, raw } = representation.metadata;
    let metadata: Readable | undefined;
    if (raw && raw.length > 0) {
      metadata = streamifyArray(raw);
    }

    const i = _path.slice(0, -1).lastIndexOf('/') + 1;
    const path = _path.slice(0, i);
    const slug = _path.slice(i);

    const resultingAction = this.interactionHandler.getResultingAction(path, slug, linkType);
    if (resultingAction.requestAction === RequestAction.CREATE_RESOURCE) {
      // (Re)write file for the resource if no container with that identifier exists.
      return new Promise(async(resolve, reject): Promise<any> => {
        try {
          const stats = await fsPromises.lstat(
            `${this.root}${resultingAction.parentContainer}${resultingAction.newIdentifier}`,
          );
          if (stats.isFile()) {
            await this.createFile(`${this.root}${resultingAction.parentContainer}`,
              resultingAction.newIdentifier,
              representation.data,
              true,
              metadata).then((): any => resolve()).catch((error): any => {
              reject(error);
            });
          } else {
            reject(new ConflictHttpError('Container with that identifier already exists.'));
          }
        } catch (error) {
          await this.createFile(`${this.root}${resultingAction.parentContainer}`,
            resultingAction.newIdentifier,
            representation.data,
            true,
            metadata).then((): any => resolve()).catch((error_): any => {
            reject(error_);
          });
        }
      });
    }

    // Create a container if the identifier doesn't exist yet.
    return new Promise(async(resolve, reject): Promise<any> => {
      try {
        await fsPromises.access(`${this.root}${resultingAction.parentContainer}${resultingAction.newIdentifier}`);
        reject(new ConflictHttpError('Resource with that identifier already exists.'));
      } catch (error) {
        // Identifier doesn't exist yet so we can create a container.
        await this.createContainer(`${this.root}${resultingAction.parentContainer}`,
          resultingAction.newIdentifier,
          true,
          metadata)
          .then((): any => resolve())
          .catch((error_): any => {
            reject(error_);
          });
      }
    });
  }

  /**
   * Strips the base from the identifier and checks if it is in the store.
   * @param identifier - Incoming identifier.
   *
   * @throws {@link NotFoundHttpError}
   * If the identifier does not match the base path of the store.
   */
  private parseIdentifier(identifier: ResourceIdentifier): string {
    const path = identifier.path.slice(this.base.length);
    if (!identifier.path.startsWith(this.base)) {
      throw new NotFoundHttpError();
    }
    return path;
  }

  /**
   * Strips the root path from the filepath and adds the base in front of it.
   * @param path - The filepath.
   *
   * @throws {@Link InternalServerError}
   * If the filepath does not match the root path of the store.
   */
  private mapFilepathToUrl(path: string): string {
    if (!path.startsWith(this.root)) {
      throw new InternalServerError('Cannot map filepath to URL.');
    }
    return this.base + path.slice(this.root.length);
  }

  /**
   * Create a file to represent a resource.
   * @param path - The path to the directory in which the file should be created.
   * @param resourceName - The name of the file to be created.
   * @param data - The data to be put in the file.
   * @param allowRecursiveCreation - Whether necessary but not existing intermediate containers may be created.
   * @param metadata - Optional metadata that will be stored at `path/resourceName.metadata` if set.
   *
   * @returns Promise of the identifier of the newly created resource.
   */
  private async createFile(path: string, resourceName: string, data: Readable,
    allowRecursiveCreation: boolean, metadata?: Readable): Promise<ResourceIdentifier> {
    if (allowRecursiveCreation) {
      await this.createContainer(path, '', true);
    }
    return new Promise(async(resolve, reject): Promise<any> => {
      try {
        const stats = await fsPromises.lstat(path);
        if (!stats.isDirectory()) {
          reject(new MethodNotAllowedHttpError('The given path is not a valid container.'));
        } else {
          if (metadata) {
            this.createMetadata(`${path}${resourceName}.metadata`, metadata, reject);
          }
          const writeStream = createWriteStream(path + resourceName);

          data.on('data', (chunk): any => writeStream.write(chunk));
          data.on('error', reject);
          data.on('end', (): any => writeStream.end());

          writeStream.on('error', reject);
          writeStream.on('finish', (): any => resolve({ path: this.mapFilepathToUrl(path + resourceName) }));
        }
      } catch (error) {
        reject(new MethodNotAllowedHttpError());
      }
    });
  }

  /**
   * Create a directory to represent a container.
   * @param path - The path to the parent directory in which the new directory should be created.
   * @param _containerName - The name of the directory to be created.
   * @param allowRecursiveCreation - Whether necessary but not existing intermediate containers may be created.
   * @param metadata - Optional metadata that will be stored at `path/_containerName/.metadata` if set.
   *
   * @returns Promise of the identifier of the newly created container.
   */
  private async createContainer(path: string, _containerName: string,
    allowRecursiveCreation: boolean, metadata?: Readable): Promise<ResourceIdentifier> {
    const containerName = ensureTrailingSlash(_containerName);
    return new Promise(async(resolve, reject): Promise<any> => {
      try {
        if (allowRecursiveCreation) {
          await fsPromises.mkdir(path + containerName, { recursive: true });
          if (metadata) {
            this.createMetadata(`${path}${containerName}.metadata`, metadata, reject);
          }
          resolve({ path: this.mapFilepathToUrl(path + containerName) });
        } else {
          const stats = await fsPromises.lstat(path);
          if (!stats.isDirectory()) {
            reject(new MethodNotAllowedHttpError('The given path is not a valid container.'));
          } else {
            await fsPromises.mkdir(path + containerName, { recursive: false });
            if (metadata) {
              this.createMetadata(`${path}${containerName}.metadata`, metadata, reject);
            }
            resolve({ path: this.mapFilepathToUrl(path + containerName) });
          }
        }
      } catch (error) {
        reject(new MethodNotAllowedHttpError());
      }
    });
  }

  /**
   * Helper function without extra validation checking to create a metadata file.
   * @param path - The filepath of the file to be created.
   * @param metadata - The data to be put in the file.
   * @param reject - The function to call when an error occur.
   */
  private createMetadata(path: string, metadata: Readable, reject: (reason?: any) => void): void {
    const writeStreamMetadata = createWriteStream(path);

    metadata.on('data', (chunk): any => writeStreamMetadata.write(chunk));
    metadata.on('error', reject);
    metadata.on('end', (): any => writeStreamMetadata.end());

    writeStreamMetadata.on('error', reject);
  }

  /**
   * Helper function to generate quads for a Container or Resource.
   * @param subject - The NamedNode for which the quads should be generated.
   * @param stats - The Stats of the subject.
   *
   * @returns The generated quads.
   */
  private generateResourceQuads(subject: NamedNode, stats: Stats): Quad[] {
    const quads: Quad[] = [];

    if (stats.isDirectory()) {
      quads.push(DataFactory.quad(subject, this.predicates.aType, this.objects.container));
      quads.push(DataFactory.quad(subject, this.predicates.aType, this.objects.basicContainer));
    }
    quads.push(DataFactory.quad(subject, this.predicates.aType, this.objects.ldpResource));
    quads.push(DataFactory.quad(subject, this.predicates.size, DataFactory.literal(stats.size)));
    quads.push(DataFactory.quad(
      subject,
      this.predicates.modified,
      DataFactory.literal(stats.mtime.toUTCString(), this.objects.dateTime),
    ));
    quads.push(DataFactory.quad(
      subject,
      this.predicates.mtime,
      DataFactory.literal(stats.mtime.getTime() / 100),
    ));

    return quads;
  }
}
