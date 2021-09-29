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
  public unit = 'bytes';
  private readonly fileIdentifierMapper: FileIdentifierMapper;

  public constructor(fileIdentifierMapper: FileIdentifierMapper) {
    this.fileIdentifierMapper = fileIdentifierMapper;
  }

  /**
   * Returns the size of the given resource in bytes
   */
  public async getSize(identifier: ResourceIdentifier): Promise<Size> {
    return { unit: this.unit, amount: await this.getTotalSize(identifier) };
  }

  private async getAllFiles(fileLocation: string, arrayOfFiles: string[] = []): Promise<string[]> {
    arrayOfFiles = arrayOfFiles ?? [];

    if (!existsSync(fileLocation)) {
      return arrayOfFiles;
    }

    if (statSync(fileLocation).isFile()) {
      return [ ...arrayOfFiles, fileLocation ];
    }

    const files = readdirSync(fileLocation);

    files.forEach(async(file: string): Promise<void> => {
      const childFileLocation = join(fileLocation, file);
      if (statSync(childFileLocation).isDirectory()) {
        arrayOfFiles = await this.getAllFiles(childFileLocation, arrayOfFiles);
      } else {
        arrayOfFiles.push(childFileLocation);
      }
    });

    return arrayOfFiles;
  }

  private async getTotalSize(identifier: ResourceIdentifier): Promise<number> {
    const fileLocation = (await this.fileIdentifierMapper.mapUrlToFilePath(identifier, false)).filePath;
    const arrayOfFiles = await this.getAllFiles(fileLocation);
    let totalSize = 0;

    arrayOfFiles.forEach((filePath: string): void => {
      totalSize += statSync(filePath).size;
    });

    return totalSize;
  }
}
