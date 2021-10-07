import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import type { FileIdentifierMapper } from '../mapping/FileIdentifierMapper';
import type { Size } from './size.model';
import type { SizeReporter } from './SizeReporter';

/**
 * SizeReporter that is used to calculate sizes of resources for a file based system
 */
export class FileSizeReporter implements SizeReporter {
  // The FileSizeReporter will always return byte values
  public readonly unit = 'bytes';
  private readonly fileIdentifierMapper: FileIdentifierMapper;

  public constructor(fileIdentifierMapper: FileIdentifierMapper) {
    this.fileIdentifierMapper = fileIdentifierMapper;
  }

  /**
   * Returns the size of the given resource ( and its children ) in bytes
   */
  public async getSize(identifier: ResourceIdentifier): Promise<Size> {
    return { unit: this.unit, amount: await this.getTotalSize(identifier) };
  }

  /**
   * Get all the files present on disk of a container.
   * If a path to a file is given it will simply return an array containing that path.
   *
   * @param fileLocation - the location on disk of the file / container of which you want the size
   * @param arrayOfFiles - An array of string of file / container locations on disk.
   * This parameter was solely added for recursive reasons
   * @returns a list of string containing every file / container present
   * in the original 'fileLocation' (if a directory) and itself
   */
  private async getAllFiles(fileLocation: string, arrayOfFiles: string[] = []): Promise<string[]> {
    arrayOfFiles = arrayOfFiles ?? [];

    if (!existsSync(fileLocation)) {
      return arrayOfFiles;
    }

    // If the file's location points to a file, simply add the file the array and return it
    if (statSync(fileLocation).isFile()) {
      return [ ...arrayOfFiles, fileLocation ];
    }

    // If the location DOES exist and is NOT a file it should be a directory
    // recursively add all children to the array
    const files = readdirSync(fileLocation);

    return files.reduce(async(acc: Promise<string[]>, current): Promise<string[]> => {
      const childFileLocation = join(fileLocation, current);

      // Add the accumulator together with the container's path and recursively add all
      // the container's children to the array
      return [
        ...await acc, fileLocation,
        ...await this.getAllFiles(childFileLocation, arrayOfFiles),
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
    return arrayOfFiles.reduce((acc, current): number => acc + statSync(current).size, 0);
  }
}
