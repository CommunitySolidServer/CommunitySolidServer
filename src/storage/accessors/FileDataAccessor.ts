import type { Stats } from 'fs';
import { createWriteStream, createReadStream, promises as fsPromises } from 'fs';
import { posix } from 'path';
import type { Readable } from 'stream';
import { DataFactory } from 'n3';
import type { NamedNode, Quad } from 'rdf-js';
import type { Representation } from '../../ldp/representation/Representation';
import { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { TEXT_TURTLE } from '../../util/ContentTypes';
import { ConflictHttpError } from '../../util/errors/ConflictHttpError';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import { isSystemError } from '../../util/errors/SystemError';
import { UnsupportedMediaTypeHttpError } from '../../util/errors/UnsupportedMediaTypeHttpError';
import type { MetadataController } from '../../util/MetadataController';
import { CONTENT_TYPE, DCTERMS, POSIX, RDF, XSD } from '../../util/UriConstants';
import { toNamedNode, toTypedLiteral } from '../../util/UriUtil';
import { pushQuad } from '../../util/Util';
import type { FileIdentifierMapper, ResourceLink } from '../FileIdentifierMapper';
import type { DataAccessor } from './DataAccessor';

const { join: joinPath } = posix;

/**
 * DataAccessor that uses the file system to store documents as files and containers as folders.
 */
export class FileDataAccessor implements DataAccessor {
  private readonly resourceMapper: FileIdentifierMapper;
  private readonly metadataController: MetadataController;

  public constructor(resourceMapper: FileIdentifierMapper, metadataController: MetadataController) {
    this.resourceMapper = resourceMapper;
    this.metadataController = metadataController;
  }

  /**
   * Only binary data can be directly stored as files so will error on non-binary data.
   */
  public async canHandle(representation: Representation): Promise<void> {
    if (!representation.binary) {
      throw new UnsupportedMediaTypeHttpError('Only binary data is supported.');
    }
  }

  /**
   * Will return data stream directly to the file corresponding to the resource.
   * Will throw NotFoundHttpError if the input is a container.
   */
  public async getData(identifier: ResourceIdentifier): Promise<Readable> {
    const link = await this.resourceMapper.mapUrlToFilePath(identifier);
    const stats = await this.getStats(link.filePath);

    if (stats.isFile()) {
      return createReadStream(link.filePath);
    }

    throw new NotFoundHttpError();
  }

  /**
   * Will return corresponding metadata by reading the metadata file (if it exists)
   * and adding file system specific metadata elements.
   */
  public async getMetadata(identifier: ResourceIdentifier): Promise<RepresentationMetadata> {
    const link = await this.resourceMapper.mapUrlToFilePath(identifier);
    const stats = await this.getStats(link.filePath);
    if (!identifier.path.endsWith('/') && stats.isFile()) {
      return this.getFileMetadata(link, stats);
    }
    if (identifier.path.endsWith('/') && stats.isDirectory()) {
      return this.getDirectoryMetadata(link, stats);
    }
    throw new NotFoundHttpError();
  }

  /**
   * Writes the given data as a file (and potential metadata as additional file).
   * The metadata file will be written first and will be deleted if something goes wrong writing the actual data.
   */
  public async writeDocument(identifier: ResourceIdentifier, data: Readable, metadata: RepresentationMetadata):
  Promise<void> {
    if (this.isMetadataPath(identifier.path)) {
      throw new ConflictHttpError('Not allowed to create files with the metadata extension.');
    }
    const link = await this.resourceMapper.mapUrlToFilePath(identifier, metadata.contentType);

    // Check if we already have a corresponding file with a different extension
    await this.verifyExistingExtension(link);

    const wroteMetadata = await this.writeMetadata(link, metadata);

    try {
      await this.writeDataFile(link.filePath, data);
    } catch (error: unknown) {
      // Delete the metadata if there was an error writing the file
      if (wroteMetadata) {
        await fsPromises.unlink(await this.getMetadataPath(link.identifier));
      }
      throw error;
    }
  }

  /**
   * Creates corresponding folder if necessary and writes metadata to metadata file if necessary.
   */
  public async writeContainer(identifier: ResourceIdentifier, metadata: RepresentationMetadata): Promise<void> {
    const link = await this.resourceMapper.mapUrlToFilePath(identifier);
    try {
      await fsPromises.mkdir(link.filePath);
    } catch (error: unknown) {
      // Don't throw if directory already exists
      if (!isSystemError(error) || error.code !== 'EEXIST') {
        throw error;
      }
    }

    await this.writeMetadata(link, metadata);
  }

  /**
   * Removes the corresponding file/folder (and metadata file).
   */
  public async deleteResource(identifier: ResourceIdentifier): Promise<void> {
    const link = await this.resourceMapper.mapUrlToFilePath(identifier);
    const stats = await this.getStats(link.filePath);

    try {
      await fsPromises.unlink(await this.getMetadataPath(link.identifier));
    } catch (error: unknown) {
      // Ignore if it doesn't exist
      if (!isSystemError(error) || error.code !== 'ENOENT') {
        throw error;
      }
    }

    if (!identifier.path.endsWith('/') && stats.isFile()) {
      await fsPromises.unlink(link.filePath);
    } else if (identifier.path.endsWith('/') && stats.isDirectory()) {
      await fsPromises.rmdir(link.filePath);
    } else {
      throw new NotFoundHttpError();
    }
  }

  /**
   * Gets the Stats object corresponding to the given file path.
   * @param path - File path to get info from.
   *
   * @throws NotFoundHttpError
   * If the file/folder doesn't exist.
   */
  private async getStats(path: string): Promise<Stats> {
    try {
      return await fsPromises.lstat(path);
    } catch (error: unknown) {
      if (isSystemError(error) && error.code === 'ENOENT') {
        throw new NotFoundHttpError();
      }
      throw error;
    }
  }

  /**
   * Generates file path that corresponds to the metadata file of the given identifier.
   * Starts from the identifier to make sure any potentially added extension has no impact on the path.
   */
  private async getMetadataPath(identifier: ResourceIdentifier): Promise<string> {
    return (await this.resourceMapper.mapUrlToFilePath({ path: `${identifier.path}.meta` }, TEXT_TURTLE)).filePath;
  }

  /**
   * Checks if the given path is a metadata path.
   */
  private isMetadataPath(path: string): boolean {
    return path.endsWith('.meta');
  }

  /**
   * Reads and generates all metadata relevant for the given file,
   * ingesting it into a RepresentationMetadata object.
   *
   * @param link - Path related metadata.
   * @param stats - Stats object of the corresponding file.
   */
  private async getFileMetadata(link: ResourceLink, stats: Stats):
  Promise<RepresentationMetadata> {
    return (await this.getBaseMetadata(link, stats, false))
      .set(CONTENT_TYPE, link.contentType);
  }

  /**
   * Reads and generates all metadata relevant for the given directory,
   * ingesting it into a RepresentationMetadata object.
   *
   * @param link - Path related metadata.
   * @param stats - Stats object of the corresponding directory.
   */
  private async getDirectoryMetadata(link: ResourceLink, stats: Stats):
  Promise<RepresentationMetadata> {
    return (await this.getBaseMetadata(link, stats, true))
      .addQuads(await this.getChildMetadataQuads(link));
  }

  /**
   * Writes the metadata of the resource to a meta file.
   * @param link - Path related metadata of the resource.
   * @param metadata - Metadata to write.
   *
   * @returns True if data was written to a file.
   */
  private async writeMetadata(link: ResourceLink, metadata: RepresentationMetadata): Promise<boolean> {
    // These are stored by file system conventions
    metadata.removeAll(RDF.type);
    metadata.removeAll(CONTENT_TYPE);
    const quads = metadata.quads();
    const metadataPath = await this.getMetadataPath(link.identifier);
    let wroteMetadata: boolean;

    // Write metadata to file if there are quads remaining
    if (quads.length > 0) {
      const serializedMetadata = this.metadataController.serializeQuads(quads);
      await this.writeDataFile(metadataPath, serializedMetadata);
      wroteMetadata = true;

    // Delete (potentially) existing metadata file if no metadata needs to be stored
    } else {
      try {
        await fsPromises.unlink(metadataPath);
      } catch (error: unknown) {
        // Metadata file doesn't exist so nothing needs to be removed
        if (!isSystemError(error) || error.code !== 'ENOENT') {
          throw error;
        }
      }
      wroteMetadata = false;
    }
    return wroteMetadata;
  }

  /**
   * Generates metadata relevant for any resources stored by this accessor.
   * @param link - Path related metadata.
   * @param stats - Stats objects of the corresponding directory.
   * @param isContainer - If the path points to a container (directory) or not.
   */
  private async getBaseMetadata(link: ResourceLink, stats: Stats, isContainer: boolean):
  Promise<RepresentationMetadata> {
    const metadata = new RepresentationMetadata(link.identifier.path)
      .addQuads(await this.getRawMetadata(link.identifier));
    metadata.addQuads(this.metadataController.generateResourceQuads(metadata.identifier as NamedNode, isContainer));
    metadata.addQuads(this.generatePosixQuads(metadata.identifier as NamedNode, stats));
    return metadata;
  }

  /**
   * Reads the metadata from the corresponding metadata file.
   * Returns an empty array if there is no metadata file.
   *
   * @param identifier - Identifier of the resource (not the metadata!).
   */
  private async getRawMetadata(identifier: ResourceIdentifier): Promise<Quad[]> {
    try {
      const metadataPath = await this.getMetadataPath(identifier);

      // Check if the metadata file exists first
      await fsPromises.lstat(metadataPath);

      const readMetadataStream = createReadStream(metadataPath);
      return await this.metadataController.parseQuads(readMetadataStream);
    } catch (error: unknown) {
      // Metadata file doesn't exist so lets keep `rawMetaData` an empty array.
      if (!isSystemError(error) || error.code !== 'ENOENT') {
        throw error;
      }
      return [];
    }
  }

  /**
   * Generate all containment related triples for a container.
   * These include the actual containment triples and specific triples for every child resource.
   *
   * @param link - Path related metadata.
   */
  private async getChildMetadataQuads(link: ResourceLink): Promise<Quad[]> {
    const quads: Quad[] = [];
    const childURIs: string[] = [];
    const files = await fsPromises.readdir(link.filePath);

    // For every child in the container we want to generate specific metadata
    for (const childName of files) {
      // Hide metadata files from containment triples
      if (this.isMetadataPath(childName)) {
        continue;
      }

      // Ignore non-file/directory entries in the folder
      const childStats = await fsPromises.lstat(joinPath(link.filePath, childName));
      if (!childStats.isFile() && !childStats.isDirectory()) {
        continue;
      }

      // Generate the URI corresponding to the child resource
      const childLink = await this.resourceMapper
        .mapFilePathToUrl(joinPath(link.filePath, childName), childStats.isDirectory());

      // Generate metadata of this specific child
      const subject = DataFactory.namedNode(childLink.identifier.path);
      quads.push(...this.metadataController.generateResourceQuads(subject, childStats.isDirectory()));
      quads.push(...this.generatePosixQuads(subject, childStats));
      childURIs.push(childLink.identifier.path);
    }

    // Generate containment metadata
    const containsQuads = this.metadataController.generateContainerContainsResourceQuads(
      DataFactory.namedNode(link.identifier.path), childURIs,
    );

    return quads.concat(containsQuads);
  }

  /**
   * Helper function to add file system related metadata.
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
   * Verifies if there already is a file corresponding to the given resource.
   * If yes, that file is removed if it does not match the path given in the input ResourceLink.
   * This can happen if the content-type differs from the one that was stored.
   *
   * @param link - ResourceLink corresponding to the new resource data.
   */
  private async verifyExistingExtension(link: ResourceLink): Promise<void> {
    try {
      // Delete the old file with the (now) wrong extension
      const oldLink = await this.resourceMapper.mapUrlToFilePath(link.identifier);
      if (oldLink.filePath !== link.filePath) {
        await fsPromises.unlink(oldLink.filePath);
      }
    } catch (error: unknown) {
      // Ignore it if the file didn't exist yet
      if (!(error instanceof NotFoundHttpError)) {
        throw error;
      }
    }
  }

  /**
   * Helper function without extra validation checking to create a data file.
   * @param path - The filepath of the file to be created.
   * @param data - The data to be put in the file.
   */
  private async writeDataFile(path: string, data: Readable): Promise<void> {
    return new Promise((resolve, reject): any => {
      const writeStream = createWriteStream(path);
      data.pipe(writeStream);
      data.on('error', reject);

      writeStream.on('error', reject);
      writeStream.on('finish', resolve);
    });
  }
}
