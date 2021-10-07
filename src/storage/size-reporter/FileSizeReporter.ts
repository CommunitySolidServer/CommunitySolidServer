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
    return { unit: this.getUnit(), amount: await this.getTotalSize(identifier) };
  }

  /**
   * Get all the files present on disk of a container.
   * If a path to a file is given it will simply return an array containing that path.
   *
   * @param fileLocation - the location on disk of the file / container of which you want the size
   * @param files - An array of string of file / container locations on disk.
   * This parameter was solely added for recursive reasons
   * @returns a list of string containing every file / container present
   * in the original 'fileLocation' (if a directory) and itself
   */
  private async getAllFiles(fileLocation: string, files: string[] = []): Promise<string[]> {
    // Check if the file exists
    try {
      await fsPromises.access(fileLocation);
    } catch {
      return files;
    }

    // If the file's location points to a file, simply add the file the array and return it
    if ((await fsPromises.lstat(fileLocation)).isFile()) {
      return [ ...files, fileLocation ];
    }

    // If the location DOES exist and is NOT a file it should be a directory
    // recursively add all children to the array
    const childFiles = await fsPromises.readdir(fileLocation);

    return childFiles.reduce(async(acc: Promise<string[]>, current): Promise<string[]> => {
      const childFileLocation = join(fileLocation, current);

      // Add the accumulator together with the container's path and recursively add all
      // the container's children to the array
      return [
        ...await acc, fileLocation,
        ...await this.getAllFiles(childFileLocation, files),
      ];
    }, Promise.resolve([]));
  }

  /**
   * Get the total size of a resource and its children if present
   *
   * @param identifier - the resource of which you want the total size of ( on disk )
   * @returns a number specifying how many bytes are used by the resource
   */
  private async getTotalSize(identifier: ResourceIdentifier): Promise<number> {
    const fileLocation = (await this.fileIdentifierMapper.mapUrlToFilePath(identifier, false)).filePath;
    // Filter out any duplicates
    const arrayOfFiles = [ ...new Set(await this.getAllFiles(fileLocation)) ];

    return arrayOfFiles.reduce(
      async(acc, current): Promise<number> => {
        // Extra check to see if file does really exist
        try {
          return await acc + (await fsPromises.lstat(current)).size;
        } catch {
          return await acc;
        }
      },
      Promise.resolve(0),
    );
  }
}
