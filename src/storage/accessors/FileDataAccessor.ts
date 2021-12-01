import type { Stats } from 'fs';
import { createWriteStream, createReadStream, promises as fsPromises } from 'fs';
import type { Readable } from 'stream';
import type { Quad } from 'rdf-js';
import type { Representation } from '../../http/representation/Representation';
import { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import { isSystemError } from '../../util/errors/SystemError';
import { UnsupportedMediaTypeHttpError } from '../../util/errors/UnsupportedMediaTypeHttpError';
import { guardStream } from '../../util/GuardedStream';
import type { Guarded } from '../../util/GuardedStream';
import { joinFilePath, isContainerIdentifier } from '../../util/PathUtil';
import { parseQuads, serializeQuads } from '../../util/QuadUtil';
import { addResourceMetadata, updateModifiedDate } from '../../util/ResourceUtil';
import { toLiteral } from '../../util/TermUtil';
import { CONTENT_TYPE, DC, LDP, POSIX, RDF, SOLID_META, XSD } from '../../util/Vocabularies';
import type { FileIdentifierMapper, ResourceLink } from '../mapping/FileIdentifierMapper';
import type { DataAccessor } from './DataAccessor';

/**
 * DataAccessor that uses the file system to store documents as files and containers as folders.
 */
export class FileDataAccessor implements DataAccessor {
  protected readonly resourceMapper: FileIdentifierMapper;

  public constructor(resourceMapper: FileIdentifierMapper) {
    this.resourceMapper = resourceMapper;
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
  public async getData(identifier: ResourceIdentifier): Promise<Guarded<Readable>> {
    const link = await this.resourceMapper.mapUrlToFilePath(identifier, false);
    const stats = await this.getStats(link.filePath);

    if (stats.isFile()) {
      return guardStream(createReadStream(link.filePath));
    }

    throw new NotFoundHttpError();
  }

  /**
   * Will return corresponding metadata by reading the metadata file (if it exists)
   * and adding file system specific metadata elements.
   */
  public async getMetadata(identifier: ResourceIdentifier): Promise<RepresentationMetadata> {
    const link = await this.resourceMapper.mapUrlToFilePath(identifier, false);
    const stats = await this.getStats(link.filePath);
    if (!isContainerIdentifier(identifier) && stats.isFile()) {
      return this.getFileMetadata(link, stats);
    }
    if (isContainerIdentifier(identifier) && stats.isDirectory()) {
      return this.getDirectoryMetadata(link, stats);
    }
    throw new NotFoundHttpError();
  }

  public async* getChildren(identifier: ResourceIdentifier): AsyncIterableIterator<RepresentationMetadata> {
    const link = await this.resourceMapper.mapUrlToFilePath(identifier, false);
    yield* this.getChildMetadata(link);
  }

  /**
   * Writes the given data as a file (and potential metadata as additional file).
   * The metadata file will be written first and will be deleted if something goes wrong writing the actual data.
   */
  public async writeDocument(identifier: ResourceIdentifier, data: Guarded<Readable>, metadata: RepresentationMetadata):
  Promise<void> {
    const link = await this.resourceMapper.mapUrlToFilePath(identifier, false, metadata.contentType);

    // Check if we already have a corresponding file with a different extension
    await this.verifyExistingExtension(link);

    const wroteMetadata = await this.writeMetadata(link, metadata);

    try {
      await this.writeDataFile(link.filePath, data);
    } catch (error: unknown) {
      // Delete the metadata if there was an error writing the file
      if (wroteMetadata) {
        const metaLink = await this.resourceMapper.mapUrlToFilePath(identifier, true);
        await fsPromises.unlink(metaLink.filePath);
      }
      throw error;
    }
  }

  /**
   * Creates corresponding folder if necessary and writes metadata to metadata file if necessary.
   */
  public async writeContainer(identifier: ResourceIdentifier, metadata: RepresentationMetadata): Promise<void> {
    const link = await this.resourceMapper.mapUrlToFilePath(identifier, false);
    try {
      await fsPromises.mkdir(link.filePath, { recursive: true });
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
    const link = await this.resourceMapper.mapUrlToFilePath(identifier, false);
    const stats = await this.getStats(link.filePath);

    try {
      const metaLink = await this.resourceMapper.mapUrlToFilePath(identifier, true);
      await fsPromises.unlink(metaLink.filePath);
    } catch (error: unknown) {
      // Ignore if it doesn't exist
      if (!isSystemError(error) || error.code !== 'ENOENT') {
        throw error;
      }
    }

    if (!isContainerIdentifier(identifier) && stats.isFile()) {
      await fsPromises.unlink(link.filePath);
    } else if (isContainerIdentifier(identifier) && stats.isDirectory()) {
      await fsPromises.rmdir(link.filePath);
    } else {
      throw new NotFoundHttpError();
    }
  }

  /**
   * Gets the Stats object corresponding to the given file path,
   * resolving symbolic links.
   * @param path - File path to get info from.
   *
   * @throws NotFoundHttpError
   * If the file/folder doesn't exist.
   */
  protected async getStats(path: string): Promise<Stats> {
    try {
      return await fsPromises.stat(path);
    } catch (error: unknown) {
      if (isSystemError(error) && error.code === 'ENOENT') {
        throw new NotFoundHttpError('', { cause: error });
      }
      throw error;
    }
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
    return await this.getBaseMetadata(link, stats, true);
  }

  /**
   * Writes the metadata of the resource to a meta file.
   * @param link - Path related metadata of the resource.
   * @param metadata - Metadata to write.
   *
   * @returns True if data was written to a file.
   */
  protected async writeMetadata(link: ResourceLink, metadata: RepresentationMetadata): Promise<boolean> {
    // These are stored by file system conventions
    metadata.remove(RDF.terms.type, LDP.terms.Resource);
    metadata.remove(RDF.terms.type, LDP.terms.Container);
    metadata.remove(RDF.terms.type, LDP.terms.BasicContainer);
    metadata.removeAll(DC.terms.modified);
    metadata.removeAll(CONTENT_TYPE);
    const quads = metadata.quads();
    const metadataLink = await this.resourceMapper.mapUrlToFilePath(link.identifier, true);
    let wroteMetadata: boolean;

    // Write metadata to file if there are quads remaining
    if (quads.length > 0) {
      // Determine required content-type based on mapper
      const serializedMetadata = serializeQuads(quads, metadataLink.contentType);
      await this.writeDataFile(metadataLink.filePath, serializedMetadata);
      wroteMetadata = true;

    // Delete (potentially) existing metadata file if no metadata needs to be stored
    } else {
      try {
        await fsPromises.unlink(metadataLink.filePath);
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
    const metadata = new RepresentationMetadata(link.identifier)
      .addQuads(await this.getRawMetadata(link.identifier));
    addResourceMetadata(metadata, isContainer);
    this.addPosixMetadata(metadata, stats);
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
      const metadataLink = await this.resourceMapper.mapUrlToFilePath(identifier, true);

      // Check if the metadata file exists first
      await fsPromises.lstat(metadataLink.filePath);

      const readMetadataStream = guardStream(createReadStream(metadataLink.filePath));
      return await parseQuads(readMetadataStream, { format: metadataLink.contentType, baseIRI: identifier.path });
    } catch (error: unknown) {
      // Metadata file doesn't exist so lets keep `rawMetaData` an empty array.
      if (!isSystemError(error) || error.code !== 'ENOENT') {
        throw error;
      }
      return [];
    }
  }

  /**
   * Generate metadata for all children in a container.
   *
   * @param link - Path related metadata.
   */
  private async* getChildMetadata(link: ResourceLink): AsyncIterableIterator<RepresentationMetadata> {
    const dir = await fsPromises.opendir(link.filePath);

    // For every child in the container we want to generate specific metadata
    for await (const entry of dir) {
      // Obtain details of the entry, resolving any symbolic links
      const childPath = joinFilePath(link.filePath, entry.name);
      let childStats;
      try {
        childStats = await this.getStats(childPath);
      } catch {
        // Skip this entry if details could not be retrieved (e.g., bad symbolic link)
        continue;
      }

      // Ignore non-file/directory entries in the folder
      if (!childStats.isFile() && !childStats.isDirectory()) {
        continue;
      }

      // Generate the URI corresponding to the child resource
      const childLink = await this.resourceMapper.mapFilePathToUrl(childPath, childStats.isDirectory());

      // Hide metadata files
      if (childLink.isMetadata) {
        continue;
      }

      // Generate metadata of this specific child
      const metadata = new RepresentationMetadata(childLink.identifier);
      addResourceMetadata(metadata, childStats.isDirectory());
      this.addPosixMetadata(metadata, childStats);
      yield metadata;
    }
  }

  /**
   * Helper function to add file system related metadata.
   * @param metadata - metadata object to add to
   * @param stats - Stats of the file/directory corresponding to the resource.
   */
  private addPosixMetadata(metadata: RepresentationMetadata, stats: Stats): void {
    updateModifiedDate(metadata, stats.mtime);
    metadata.add(POSIX.terms.mtime,
      toLiteral(Math.floor(stats.mtime.getTime() / 1000), XSD.terms.integer),
      SOLID_META.terms.ResponseMetadata);
    if (!stats.isDirectory()) {
      metadata.add(POSIX.terms.size, toLiteral(stats.size, XSD.terms.integer), SOLID_META.terms.ResponseMetadata);
    }
  }

  /**
   * Verifies if there already is a file corresponding to the given resource.
   * If yes, that file is removed if it does not match the path given in the input ResourceLink.
   * This can happen if the content-type differs from the one that was stored.
   *
   * @param link - ResourceLink corresponding to the new resource data.
   */
  protected async verifyExistingExtension(link: ResourceLink): Promise<void> {
    try {
      // Delete the old file with the (now) wrong extension
      const oldLink = await this.resourceMapper.mapUrlToFilePath(link.identifier, false);
      if (oldLink.filePath !== link.filePath) {
        await fsPromises.unlink(oldLink.filePath);
      }
    } catch (error: unknown) {
      // Ignore it if the file didn't exist yet and couldn't be unlinked
      if (!isSystemError(error) || error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Helper function without extra validation checking to create a data file.
   * @param path - The filepath of the file to be created.
   * @param data - The data to be put in the file.
   */
  protected async writeDataFile(path: string, data: Readable): Promise<void> {
    return new Promise((resolve, reject): any => {
      const writeStream = createWriteStream(path);
      data.pipe(writeStream);
      data.on('error', (error): void => {
        reject(error);
        writeStream.end();
      });

      writeStream.on('error', reject);
      writeStream.on('finish', resolve);
    });
  }
}
