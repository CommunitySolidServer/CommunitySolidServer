import type { Stats } from 'fs';
import { createReadStream, createWriteStream, promises as fsPromises } from 'fs';
import { posix } from 'path';
import type { Readable } from 'stream';
import { DataFactory } from 'n3';
import type { NamedNode, Quad } from 'rdf-js';
import streamifyArray from 'streamify-array';
import type { Representation } from '../ldp/representation/Representation';
import { RepresentationMetadata } from '../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { INTERNAL_QUADS } from '../util/ContentTypes';
import { ConflictHttpError } from '../util/errors/ConflictHttpError';
import { MethodNotAllowedHttpError } from '../util/errors/MethodNotAllowedHttpError';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import { UnsupportedMediaTypeHttpError } from '../util/errors/UnsupportedMediaTypeHttpError';
import type { InteractionController } from '../util/InteractionController';
import type { MetadataController } from '../util/MetadataController';
import { CONTENT_TYPE, DCTERMS, HTTP, POSIX, RDF, XSD } from '../util/UriConstants';
import { toNamedNode, toTypedLiteral } from '../util/UriUtil';
import { ensureTrailingSlash, pushQuad } from '../util/Util';
import type { ExtensionBasedMapper } from './ExtensionBasedMapper';
import type { ResourceLink } from './FileIdentifierMapper';
import type { ResourceStore } from './ResourceStore';

const { join: joinPath } = posix;

/**
 * Resource store storing its data in the file system backend.
 * All requests will throw an {@link NotFoundHttpError} if unknown identifiers get passed.
 */
export class FileResourceStore implements ResourceStore {
  private readonly interactionController: InteractionController;
  private readonly metadataController: MetadataController;
  private readonly resourceMapper: ExtensionBasedMapper;

  /**
   * @param resourceMapper - The file resource mapper.
   * @param interactionController - Instance of InteractionController to use.
   * @param metadataController - Instance of MetadataController to use.
   */
  public constructor(resourceMapper: ExtensionBasedMapper, interactionController: InteractionController,
    metadataController: MetadataController) {
    this.interactionController = interactionController;
    this.metadataController = metadataController;
    this.resourceMapper = resourceMapper;
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
    if (!representation.binary) {
      throw new UnsupportedMediaTypeHttpError('FileResourceStore only supports binary representations.');
    }

    // Get the path from the request URI, all metadata triples if any, and the Slug and Link header values.
    const path = (await this.resourceMapper.mapUrlToFilePath(container)).filePath;
    const slug = representation.metadata.get(HTTP.slug)?.value;
    const types = representation.metadata.getAll(RDF.type);

    // Create a new container or resource in the parent container with a specific name based on the incoming headers.
    const isContainer = this.interactionController.isContainer(slug, types);
    const newIdentifier = this.interactionController.generateIdentifier(isContainer, slug);
    let metadata;
    // eslint-disable-next-line no-param-reassign
    representation.metadata.identifier = DataFactory.namedNode(newIdentifier);
    const raw = representation.metadata.quads();
    if (raw.length > 0) {
      metadata = this.metadataController.serializeQuads(raw);
    }

    return isContainer ?
      this.createContainer(path, newIdentifier, path.endsWith('/'), metadata) :
      this.createFile(path, newIdentifier, representation.data, path.endsWith('/'), metadata);
  }

  /**
   * Deletes the given resource.
   * @param identifier - Identifier of resource to delete.
   */
  public async deleteResource(identifier: ResourceIdentifier): Promise<void> {
    let path = this.resourceMapper.getRelativePath(identifier);
    if (path === '' || ensureTrailingSlash(path) === '/') {
      throw new MethodNotAllowedHttpError('Cannot delete root container.');
    }

    // Get the file status of the path defined by the request URI mapped to the corresponding filepath.
    path = (await this.resourceMapper.mapUrlToFilePath(identifier)).filePath;
    let stats;
    try {
      stats = await fsPromises.lstat(path);
    } catch {
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
    const resourceLink = await this.resourceMapper.mapUrlToFilePath(identifier);
    let stats;
    try {
      stats = await fsPromises.lstat(resourceLink.filePath);
    } catch {
      throw new NotFoundHttpError();
    }

    // Get the file or directory representation of the path according to its status.
    if (stats.isFile()) {
      return await this.getFileRepresentation(resourceLink, stats);
    }
    if (stats.isDirectory()) {
      return await this.getDirectoryRepresentation(resourceLink, stats);
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
    if (!representation.binary) {
      throw new UnsupportedMediaTypeHttpError('FileResourceStore only supports binary representations.');
    }

    // Break up the request URI in the different parts `containerPath` and `documentName` as we know their semantics
    // from addResource to call the InteractionController in the same way.
    const { containerPath, documentName } = this.resourceMapper.extractDocumentName(identifier);
    // eslint-disable-next-line no-param-reassign
    representation.metadata.identifier = DataFactory.namedNode(identifier.path);
    const raw = representation.metadata.quads();
    const types = representation.metadata.getAll(RDF.type);
    let metadata: Readable | undefined;
    if (raw.length > 0) {
      metadata = this.metadataController.serializeQuads(raw);
    }

    // Create a new container or resource in the parent container with a specific name based on the incoming headers.
    const isContainer = this.interactionController.isContainer(documentName, types);
    const newIdentifier = this.interactionController.generateIdentifier(isContainer, documentName);
    return isContainer ?
      await this.setDirectoryRepresentation(containerPath, newIdentifier, metadata) :
      await this.setFileRepresentation(containerPath, newIdentifier, representation.data, metadata);
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
    } catch {
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
      throw new ConflictHttpError('Can only delete empty containers.');
    }

    // Only delete the metadata file as auxiliary resource because this is the only file created by this store.
    try {
      await fsPromises.unlink(joinPath(path, '.metadata'));
    } catch {
      // It's ok if there was no metadata file.
    }

    await fsPromises.rmdir(path);
  }

  /**
   * Helper function to get the representation of a file in the file system.
   * It loads the quads from the corresponding metadata file if it exists.
   * @param resourceLink - The path information of the resource.
   * @param stats - The Stats of the file.
   *
   * @returns The corresponding Representation.
   */
  private async getFileRepresentation(resourceLink: ResourceLink, stats: Stats): Promise<Representation> {
    const readStream = createReadStream(resourceLink.filePath);
    let rawMetadata: Quad[] = [];
    try {
      const readMetadataStream = createReadStream(`${resourceLink.filePath}.metadata`);
      rawMetadata = await this.metadataController.parseQuads(readMetadataStream);
    } catch {
      // Metadata file doesn't exist so lets keep `rawMetaData` an empty array.
    }
    const metadata = new RepresentationMetadata(resourceLink.identifier.path).addQuads(rawMetadata)
      .set(DCTERMS.modified, toTypedLiteral(stats.mtime.toISOString(), XSD.dateTime))
      .set(POSIX.size, toTypedLiteral(stats.size, XSD.integer));
    metadata.contentType = resourceLink.contentType;
    return { metadata, data: readStream, binary: true };
  }

  /**
   * Helper function to get the representation of a directory in the file system.
   * It loads the quads from the corresponding metadata file if it exists
   * and generates quad representations for all its children.
   *
   * @param resourceLink - The path information of the resource.
   * @param stats - The Stats of the directory.
   *
   * @returns The corresponding Representation.
   */
  private async getDirectoryRepresentation(resourceLink: ResourceLink, stats: Stats): Promise<Representation> {
    const files = await fsPromises.readdir(resourceLink.filePath);

    const containerURI = DataFactory.namedNode(resourceLink.identifier.path);

    const quads = this.metadataController.generateResourceQuads(containerURI, true);
    quads.push(...this.generatePosixQuads(containerURI, stats));
    quads.push(...await this.getDirChildrenQuadRepresentation(files, resourceLink.filePath, containerURI));

    let rawMetadata: Quad[] = [];
    try {
      const readMetadataStream = createReadStream(joinPath(resourceLink.filePath, '.metadata'));
      rawMetadata = await this.metadataController.parseQuads(readMetadataStream);
    } catch {
      // Metadata file doesn't exist so lets keep `rawMetaData` an empty array.
    }

    const metadata = new RepresentationMetadata(containerURI, {
      [DCTERMS.modified]: toTypedLiteral(stats.mtime.toISOString(), XSD.dateTime),
      [CONTENT_TYPE]: INTERNAL_QUADS,
    });
    metadata.addQuads(rawMetadata);

    return {
      binary: false,
      data: streamifyArray(quads),
      metadata,
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
  private async getDirChildrenQuadRepresentation(files: string[], path: string, containerURI: NamedNode):
  Promise<Quad[]> {
    const quads: Quad[] = [];
    const childURIs: string[] = [];
    for (const childName of files) {
      try {
        const childStats = await fsPromises.lstat(joinPath(path, childName));
        if (!childStats.isFile() && !childStats.isDirectory()) {
          continue;
        }
        const childLink = await this.resourceMapper
          .mapFilePathToUrl(joinPath(path, childName), childStats.isDirectory());

        const subject = DataFactory.namedNode(childLink.identifier.path);
        quads.push(...this.metadataController.generateResourceQuads(subject, childStats.isDirectory()));
        quads.push(...this.generatePosixQuads(subject, childStats));
        childURIs.push(childLink.identifier.path);
      } catch {
        // Skip the child if there is an error.
      }
    }

    const containsQuads = this.metadataController.generateContainerContainsResourceQuads(containerURI, childURIs);

    return quads.concat(containsQuads);
  }

  /**
   * Helper function to add file system related metadata
   * @param subject - Subject for the new quads.
   * @param stats - Stats of the file/directory corresponding to the resource.
   */
  private generatePosixQuads(subject: NamedNode, stats: Stats): Quad[] {
    const quads: Quad[] = [];
    pushQuad(quads, subject, toNamedNode(POSIX.size), toTypedLiteral(stats.size, XSD.integer));
    pushQuad(quads, subject, toNamedNode(DCTERMS.modified), toTypedLiteral(stats.mtime.toISOString(), XSD.dateTime));
    pushQuad(quads, subject, toNamedNode(POSIX.mtime), toTypedLiteral(
      Math.floor(stats.mtime.getTime() / 1000), XSD.integer,
    ));
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
      stats = await fsPromises.lstat(joinPath(path, newIdentifier));
    } catch {
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
      await fsPromises.access(joinPath(path, newIdentifier));
      throw new ConflictHttpError('Resource with that identifier already exists.');
    } catch (error: unknown) {
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
    const stats = await fsPromises.lstat(path);

    // Only create the file if the provided filepath is a valid directory.
    if (!stats.isDirectory()) {
      throw new MethodNotAllowedHttpError('The given path is not a valid container.');
    } else {
      // If metadata is specified, save it in a corresponding metadata file.
      if (metadata) {
        await this.createDataFile(joinPath(path, `${resourceName}.metadata`), metadata);
      }

      // If no error thrown from above, indicating failed metadata file creation, create the actual resource file.
      try {
        const fullPath = joinPath(path, resourceName);
        await this.createDataFile(fullPath, data);
        return (await this.resourceMapper.mapFilePathToUrl(fullPath, false)).identifier;
      } catch (error: unknown) {
        // Normal file has not been created so we don't want the metadata file to remain.
        await fsPromises.unlink(joinPath(path, `${resourceName}.metadata`));
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
    const fullPath = joinPath(path, containerName);

    // If recursive creation is not allowed, check if the parent container exists and then create the child directory.
    try {
      if (!allowRecursiveCreation) {
        const stats = await fsPromises.lstat(path);
        if (!stats.isDirectory()) {
          throw new MethodNotAllowedHttpError('The given path is not a valid container.');
        }
      }
      await fsPromises.mkdir(fullPath, { recursive: allowRecursiveCreation });
    } catch (error: unknown) {
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
      } catch (error: unknown) {
        // Failed to create the metadata file so remove the created directory.
        await fsPromises.rmdir(fullPath);
        throw error;
      }
    }
    return (await this.resourceMapper.mapFilePathToUrl(fullPath, true)).identifier;
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
