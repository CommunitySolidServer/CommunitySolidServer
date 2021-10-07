import { mkdirSync, promises as fsPromises } from 'fs';
import { join } from 'path';
import type { Readable } from 'stream';
import { v4 } from 'uuid';
import type { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import type { Guarded } from '../../util/GuardedStream';
import type { FileIdentifierMapper } from '../mapping/FileIdentifierMapper';
import { FileDataAccessor } from './FileDataAccessor';

/**
 * DataAccessor that uses the file system to store documents as files and containers as folders.
 */
export class AtomicFileDataAccessor extends FileDataAccessor {
  private readonly tempFilePath: string;

  public constructor(resourceMapper: FileIdentifierMapper, tempFilePath: string) {
    super(resourceMapper);
    this.tempFilePath = tempFilePath;
    // Cannot use fsPromises in constructor
    mkdirSync(this.tempFilePath, { recursive: true });
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

    const metadataWritten = await this.writeMetadata(link, metadata);
    // Generate temporary file name
    const tempFilePath = join(this.tempFilePath, `temp-${v4()}.txt`);

    try {
      await this.writeDataFile(tempFilePath, data);

      // When no quota errors occur move the file to its desired location
      await fsPromises.rename(tempFilePath, link.filePath);
    } catch (error: unknown) {
      // Delete the data already written
      if ((await this.getStats(tempFilePath)).isFile()) {
        await fsPromises.unlink(tempFilePath);
      }
      // Delete the metadata if there was an error writing the file
      if (metadataWritten) {
        const metaLink = await this.resourceMapper.mapUrlToFilePath(identifier, true);
        await fsPromises.unlink(metaLink.filePath);
      }
      throw error;
    }
  }
}
