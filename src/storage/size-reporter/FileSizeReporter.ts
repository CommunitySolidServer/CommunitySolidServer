import type { Stats } from 'fs';
import { promises as fsPromises } from 'fs';
import { join } from 'path';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import type { FileIdentifierMapper } from '../mapping/FileIdentifierMapper';
import type { Size } from './Size';
import type { SizeReporter } from './SizeReporter';

/**
 * SizeReporter that is used to calculate sizes of resources for a file based system
 */
export class FileSizeReporter implements SizeReporter {
  private readonly fileIdentifierMapper: FileIdentifierMapper;

  public constructor(fileIdentifierMapper: FileIdentifierMapper) {
    this.fileIdentifierMapper = fileIdentifierMapper;
  }

  /** The FileSizeReporter will always return data in the form of bytes */
  public getUnit(): string {
    return 'bytes';
  }

  /**
   * Returns the size of the given resource ( and its children ) in bytes
   */
  public async getSize(identifier: ResourceIdentifier): Promise<Size> {
    const fileLocation = (await this.fileIdentifierMapper.mapUrlToFilePath(identifier, false)).filePath;

    return { unit: this.getUnit(), amount: await this.getTotalSize(fileLocation) };
  }

  /**
   * Get the total size of a resource and its children if present
   *
   * @param fileLocation - the resource of which you want the total size of ( on disk )
   * @returns a number specifying how many bytes are used by the resource
   */
  private async getTotalSize(fileLocation: string): Promise<number> {
    let lstat: Stats;

    // Check if the file exists
    try {
      lstat = await fsPromises.lstat(fileLocation);
    } catch {
      return 0;
    }

    // If the file's location points to a file, simply add the file the array and return it
    if (lstat.isFile()) {
      return lstat.size;
    }

    // If the location DOES exist and is NOT a file it should be a directory
    // recursively add all children to the array
    const childFiles = await fsPromises.readdir(fileLocation);

    return lstat.size + await childFiles.reduce(async(acc: Promise<number>, current): Promise<number> => {
      const childFileLocation = join(fileLocation, current);

      return await acc + await this.getTotalSize(childFileLocation);
    }, Promise.resolve(0));
  }
}
