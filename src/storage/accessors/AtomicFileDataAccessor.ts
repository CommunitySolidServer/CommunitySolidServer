import { mkdirSync, promises as fsPromises } from 'fs';
import { join } from 'path';
import type { Readable } from 'stream';
import { v4 } from 'uuid';
import type { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import type { Guarded } from '../../util/GuardedStream';
import type { FileIdentifierMapper } from '../mapping/FileIdentifierMapper';
import type { AtomicDataAccessor } from './AtomicDataAccessor';
import { FileDataAccessor } from './FileDataAccessor';

/**
 * AtomicDataAccessor that uses the file system to store documents as files and containers as folders.
 * Data will first be written to a temporary location and only if no errors occur
 * will the data be written to the desired location.
 */
export class AtomicFileDataAccessor extends FileDataAccessor implements AtomicDataAccessor {
  private readonly tempFilePath: string;

  public constructor(resourceMapper: FileIdentifierMapper, tempFilePath: string) {
    super(resourceMapper);
    this.tempFilePath = process.cwd() + tempFilePath;
    // Cannot use fsPromises in constructor
    mkdirSync(this.tempFilePath, { recursive: true });
  }

  /**
   * Writes the given data as a file (and potential metadata as additional file).
   * Data will first be written to a temporary file and if no errors occur only then the
   * file will be moved to desired destination.
   * If the stream errors it is made sure the temporary file will be deleted.
   * The metadata file will only be written if the data was written successfully.
   */
  public async writeDocument(identifier: ResourceIdentifier, data: Guarded<Readable>, metadata: RepresentationMetadata):
  Promise<void> {
    const link = await this.resourceMapper.mapUrlToFilePath(identifier, false, metadata.contentType);

    // Check if we already have a corresponding file with a different extension
    await this.verifyExistingExtension(link);

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
      throw error;
    }
    await this.writeMetadata(link, metadata);
  }
}
