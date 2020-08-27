import { createReadStream, createWriteStream, promises as fsPromises, Stats } from 'fs';
import { posix } from 'path';
import { Readable } from 'stream';
import arrayifyStream from 'arrayify-stream';
import { contentType as getContentTypeFromExtension } from 'mime-types';
import { Quad } from 'rdf-js';
import streamifyArray from 'streamify-array';
import { RuntimeConfig } from '../init/RuntimeConfig';
import { Representation } from '../ldp/representation/Representation';
import { RepresentationMetadata } from '../ldp/representation/RepresentationMetadata';
import { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { CONTENT_TYPE_QUADS, DATA_TYPE_BINARY, DATA_TYPE_QUAD } from '../util/ContentTypes';
import { ConflictHttpError } from '../util/errors/ConflictHttpError';
import { MethodNotAllowedHttpError } from '../util/errors/MethodNotAllowedHttpError';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import { UnsupportedMediaTypeHttpError } from '../util/errors/UnsupportedMediaTypeHttpError';
import { InteractionController } from '../util/InteractionController';
import { MetadataController } from '../util/MetadataController';
import { ensureTrailingSlash, trimTrailingSlashes } from '../util/Util';
import { ResourceStore } from './ResourceStore';

const { extname, join: joinPath, normalize: normalizePath } = posix;

/**
 * Resource store storing its data in the file system backend.
 * All requests will throw an {@link NotFoundHttpError} if unknown identifiers get passed.
 */
export class FileResourceStore implements ResourceStore {
  private readonly runtimeConfig: RuntimeConfig;
  private readonly interactionController: InteractionController;
  private readonly metadataController: MetadataController;

  /**
   * @param runtimeConfig - The runtime config.
   * @param interactionController - Instance of InteractionController to use.
   * @param metadataController - Instance of MetadataController to use.
   */
  public constructor(runtimeConfig: RuntimeConfig, interactionController: InteractionController,
    metadataController: MetadataController) {
    this.runtimeConfig = runtimeConfig;
    this.interactionController = interactionController;
    this.metadataController = metadataController;
  }

  public get baseRequestURI(): string {
    return trimTrailingSlashes(this.runtimeConfig.base);
  }

  public get rootFilepath(): string {
    return trimTrailingSlashes(this.runtimeConfig.rootFilepath);
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

    // Get the path from the request URI, all metadata triples if any, and the Slug and Link header values.
    const path = this.parseIdentifier(container);
    const { slug, raw } = representation.metadata;
    const linkTypes = representation.metadata.linkRel?.type;
    let metadata;
    if (raw.length > 0) {
      metadata = this.metadataController.generateReadableFromQuads(raw);
    }

    // Create a new container or resource in the parent container with a specific name based on the incoming headers.
    const isContainer = this.interactionController.isContainer(slug, linkTypes);
    const newIdentifier = this.interactionController.generateIdentifier(isContainer, slug);
    return isContainer ?
      this.createContainer(path, newIdentifier, path.endsWith('/'), metadata) :
      this.createFile(path, newIdentifier, representation.data, path.endsWith('/'), metadata);
  }

  /**
   * Deletes the given resource.
   * @param identifier - Identifier of resource to delete.
   */
  public async deleteResource(identifier: ResourceIdentifier): Promise<void> {
    let path = this.parseIdentifier(identifier);
    if (path === '' || ensureTrailingSlash(path) === '/') {
      throw new MethodNotAllowedHttpError('Cannot delete root container.');
    }

    // Get the file status of the path defined by the request URI mapped to the corresponding filepath.
    path = joinPath(this.rootFilepath, path);
    let stats;
    try {
      stats = await fsPromises.lstat(path);
    } catch (error) {
      throw new NotFoundHttpError();
    }

    // Delete as file or as directory according to the status.
    if (stats.isFile()) {
      await this.deleteFile(path);
    } else if (stats.isDirectory()) {
      await this.deleteDirectory(ensureTrailingSlash(path));
    } else {
      throw new NotFoundHttpError();
    }
  }

  /**
   * Returns the stored representation for the given identifier.
   * No preferences are supported.
   * @param identifier - Identifier to retrieve.
   *
   * @returns The corresponding Representation.
   */
  public async getRepresentation(identifier: ResourceIdentifier): Promise<Representation> {
    // Get the file status of the path defined by the request URI mapped to the corresponding filepath.
    const path = joinPath(this.rootFilepath, this.parseIdentifier(identifier));
    let stats;
    try {
      stats = await fsPromises.lstat(path);
    } catch (error) {
      throw new NotFoundHttpError();
    }

    // Get the file or directory representation of the path according to its status.
    if (stats.isFile()) {
      return await this.getFileRepresentation(path, stats);
    }
    if (stats.isDirectory()) {
      return await this.getDirectoryRepresentation(ensureTrailingSlash(path), stats);
    }
    throw new NotFoundHttpError();
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

    // Break up the request URI in the different parts `path` and `slug` as we know their semantics from addResource
    // to call the InteractionController in the same way.
    const [ , path, slug ] = /^(.*\/)([^/]+\/?)?$/u.exec(this.parseIdentifier(identifier)) ?? [];
    if ((typeof path !== 'string' || normalizePath(path) === '/') && typeof slug !== 'string') {
      throw new ConflictHttpError('Container with that identifier already exists (root).');
    }
    const { raw } = representation.metadata;
    const linkTypes = representation.metadata.linkRel?.type;
    let metadata: Readable | undefined;
    if (raw.length > 0) {
      metadata = streamifyArray(raw);
    }

    // Create a new container or resource in the parent container with a specific name based on the incoming headers.
    const isContainer = this.interactionController.isContainer(slug, linkTypes);
    const newIdentifier = this.interactionController.generateIdentifier(isContainer, slug);
    return isContainer ?
      await this.setDirectoryRepresentation(path, newIdentifier, metadata) :
      await this.setFileRepresentation(path, newIdentifier, representation.data, metadata);
  }

  /**
   * Strips the baseRequestURI from the identifier and checks if the stripped base URI matches the store's one.
   * @param identifier - Incoming identifier.
   *
   * @throws {@link NotFoundHttpError}
   * If the identifier does not match the baseRequestURI path of the store.
   */
  private parseIdentifier(identifier: ResourceIdentifier): string {
    if (!identifier.path.startsWith(this.baseRequestURI)) {
      throw new NotFoundHttpError();
    }
    return identifier.path.slice(this.baseRequestURI.length);
  }

  /**
   * Strips the rootFilepath path from the filepath and adds the baseRequestURI in front of it.
   * @param path - The filepath.
   *
   * @throws {@Link Error}
   * If the filepath does not match the rootFilepath path of the store.
   */
  private mapFilepathToUrl(path: string): string {
    if (!path.startsWith(this.rootFilepath)) {
      throw new Error(`File ${path} is not part of the file storage at ${this.rootFilepath}.`);
    }
    return this.baseRequestURI + path.slice(this.rootFilepath.length);
  }

  /**
   * Helper function to delete a file and its corresponding metadata file if such exists.
   * @param path - The path to the file.
   */
  private async deleteFile(path: string): Promise<void> {
    await fsPromises.unlink(path);

    // Only delete the metadata file as auxiliary resource because this is the only file created by this store.
    try {
      await fsPromises.unlink(`${path}.metadata`);
    } catch (_) {
      // It's ok if there was no metadata file.
    }
  }

  /**
   * Helper function to delete a directory and its corresponding metadata file if such exists.
   * @param path - The path to the directory.
   */
  private async deleteDirectory(path: string): Promise<void> {
    const files = await fsPromises.readdir(path);
    const match = files.find((file): any => !file.startsWith('.metadata'));
    if (typeof match === 'string') {
      throw new ConflictHttpError('Container is not empty.');
    }

    // Only delete the metadata file as auxiliary resource because this is the only file created by this store.
    try {
      await fsPromises.unlink(joinPath(path, '.metadata'));
    } catch (_) {
      // It's ok if there was no metadata file.
    }

    await fsPromises.rmdir(path);
  }

  /**
   * Helper function to get the representation of a file in the file system.
   * It loads the quads from the corresponding metadata file if it exists.
   * @param path - The path to the file.
   * @param stats - The Stats of the file.
   *
   * @returns The corresponding Representation.
   */
  private async getFileRepresentation(path: string, stats: Stats): Promise<Representation> {
    const readStream = createReadStream(path);
    const contentType = getContentTypeFromExtension(extname(path));
    let rawMetadata: Quad[] = [];
    try {
      const readMetadataStream = createReadStream(`${path}.metadata`);
      rawMetadata = await this.metadataController.generateQuadsFromReadable(readMetadataStream);
    } catch (_) {
      // Metadata file doesn't exist so lets keep `rawMetaData` an empty array.
    }
    const metadata: RepresentationMetadata = {
      raw: rawMetadata,
      dateTime: stats.mtime,
      byteSize: stats.size,
    };
    if (contentType) {
      metadata.contentType = contentType;
    }
    return { metadata, data: readStream, dataType: DATA_TYPE_BINARY };
  }

  /**
   * Helper function to get the representation of a directory in the file system.
   * It loads the quads from the corresponding metadata file if it exists
   * and generates quad representations for all its children.
   *
   * @param path - The path to the directory.
   * @param stats - The Stats of the directory.
   *
   * @returns The corresponding Representation.
   */
  private async getDirectoryRepresentation(path: string, stats: Stats): Promise<Representation> {
    const files = await fsPromises.readdir(path);
    const quads: Quad[] = [];

    const containerURI = this.mapFilepathToUrl(path);

    quads.push(...this.metadataController.generateResourceQuads(containerURI, stats));
    quads.push(...await this.getDirChildrenQuadRepresentation(files, path, containerURI));

    let rawMetadata: Quad[] = [];
    try {
      const readMetadataStream = createReadStream(joinPath(path, '.metadata'));
      rawMetadata = await arrayifyStream(readMetadataStream);
    } catch (_) {
      // Metadata file doesn't exist so lets keep `rawMetaData` an empty array.
    }

    return {
      dataType: DATA_TYPE_QUAD,
      data: streamifyArray(quads),
      metadata: {
        raw: rawMetadata,
        dateTime: stats.mtime,
        contentType: CONTENT_TYPE_QUADS,
      },
    };
  }

  /**
   * Helper function to get quad representations for all children in a directory.
   * @param files - List of all children in the directory.
   * @param path - The path to the directory.
   * @param containerURI - The URI of the directory.
   *
   * @returns A promise containing all quads.
   */
  private async getDirChildrenQuadRepresentation(files: string[], path: string, containerURI: string): Promise<Quad[]> {
    const quads: Quad[] = [];
    for (const childName of files) {
      try {
        const childURI = this.mapFilepathToUrl(joinPath(path, childName));
        const childStats = await fsPromises.lstat(joinPath(path, childName));
        if (!childStats.isFile() && !childStats.isDirectory()) {
          continue;
        }

        quads.push(this.metadataController.generateContainerContainsResourceQuad(containerURI, childURI));
        quads.push(...this.metadataController.generateResourceQuads(childURI, childStats));
      } catch (_) {
        // Skip the child if there is an error.
      }
    }
    return quads;
  }

  /**
   * Helper function to (re)write file for the resource if no container with that identifier exists.
   * @param path - The path to the directory of the file.
   * @param newIdentifier - The name of the file to be created or overwritten.
   * @param data - The data to be put in the file.
   * @param metadata - Optional metadata.
   */
  private async setFileRepresentation(path: string, newIdentifier: string, data: Readable, metadata?: Readable):
  Promise<void> {
    // (Re)write file for the resource if no container with that identifier exists.
    let stats;
    try {
      stats = await fsPromises.lstat(
        joinPath(this.rootFilepath, path, newIdentifier),
      );
    } catch (error) {
      await this.createFile(path, newIdentifier, data, true, metadata);
      return;
    }
    if (stats.isFile()) {
      await this.createFile(path, newIdentifier, data, true, metadata);
      return;
    }
    throw new ConflictHttpError('Container with that identifier already exists.');
  }

  /**
   * Helper function to create a container if the identifier doesn't exist yet.
   * @param path - The path to the parent directory in which the new directory should be created.
   * @param newIdentifier - The name of the directory to be created.
   * @param metadata - Optional metadata.
   */
  private async setDirectoryRepresentation(path: string, newIdentifier: string, metadata?: Readable): Promise<void> {
    // Create a container if the identifier doesn't exist yet.
    try {
      await fsPromises.access(
        joinPath(this.rootFilepath, path, newIdentifier),
      );
      throw new ConflictHttpError('Resource with that identifier already exists.');
    } catch (error) {
      if (error instanceof ConflictHttpError) {
        throw error;
      }

      // Identifier doesn't exist yet so we can create a container.
      await this.createContainer(path, newIdentifier, true, metadata);
    }
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
    // Create the intermediate containers if `allowRecursiveCreation` is true.
    if (allowRecursiveCreation) {
      await this.createContainer(path, '', true);
    }

    // Get the file status of the filepath of the directory where the file is to be created.
    let stats;
    try {
      stats = await fsPromises.lstat(joinPath(this.rootFilepath, path));
    } catch (error) {
      throw new MethodNotAllowedHttpError();
    }

    // Only create the file if the provided filepath is a valid directory.
    if (!stats.isDirectory()) {
      throw new MethodNotAllowedHttpError('The given path is not a valid container.');
    } else {
      // If metadata is specified, save it in a corresponding metadata file.
      if (metadata) {
        await this.createDataFile(joinPath(this.rootFilepath, path, `${resourceName}.metadata`), metadata);
      }

      // If no error thrown from above, indicating failed metadata file creation, create the actual resource file.
      try {
        await this.createDataFile(joinPath(this.rootFilepath, path, resourceName), data);
        return { path: this.mapFilepathToUrl(joinPath(this.rootFilepath, path, resourceName)) };
      } catch (error) {
        // Normal file has not been created so we don't want the metadata file to remain.
        await fsPromises.unlink(joinPath(this.rootFilepath, path, `${resourceName}.metadata`));
        throw error;
      }
    }
  }

  /**
   * Create a directory to represent a container.
   * @param path - The path to the parent directory in which the new directory should be created.
   * @param containerName - The name of the directory to be created.
   * @param allowRecursiveCreation - Whether necessary but not existing intermediate containers may be created.
   * @param metadata - Optional metadata that will be stored at `path/containerName/.metadata` if set.
   *
   * @returns Promise of the identifier of the newly created container.
   */
  private async createContainer(path: string, containerName: string,
    allowRecursiveCreation: boolean, metadata?: Readable): Promise<ResourceIdentifier> {
    const fullPath = ensureTrailingSlash(joinPath(this.rootFilepath, path, containerName));

    // If recursive creation is not allowed, check if the parent container exists and then create the child directory.
    try {
      if (!allowRecursiveCreation) {
        const stats = await fsPromises.lstat(joinPath(this.rootFilepath, path));
        if (!stats.isDirectory()) {
          throw new MethodNotAllowedHttpError('The given path is not a valid container.');
        }
      }
      await fsPromises.mkdir(fullPath, { recursive: allowRecursiveCreation });
    } catch (error) {
      if (error instanceof MethodNotAllowedHttpError) {
        throw error;
      }
      throw new MethodNotAllowedHttpError();
    }

    // If no error thrown from above, indicating failed container creation, create a corresponding metadata file in the
    // new directory if applicable.
    if (metadata) {
      try {
        await this.createDataFile(joinPath(fullPath, '.metadata'), metadata);
      } catch (error) {
        // Failed to create the metadata file so remove the created directory.
        await fsPromises.rmdir(fullPath);
        throw error;
      }
    }
    return { path: this.mapFilepathToUrl(fullPath) };
  }

  /**
   * Helper function without extra validation checking to create a data file.
   * @param path - The filepath of the file to be created.
   * @param data - The data to be put in the file.
   */
  private async createDataFile(path: string, data: Readable): Promise<void> {
    return new Promise((resolve, reject): any => {
      const writeStream = createWriteStream(path);
      data.pipe(writeStream);
      data.on('error', reject);

      writeStream.on('error', reject);
      writeStream.on('finish', resolve);
    });
  }
}
