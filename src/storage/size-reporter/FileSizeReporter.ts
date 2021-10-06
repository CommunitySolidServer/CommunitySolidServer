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

    return files.reduce(async(acc: Promise<string[]>, current): Promise<string[]> => {
      const childFileLocation = join(fileLocation, current);

      return [
        ...await acc, fileLocation,
        ...await this.getAllFiles(childFileLocation, arrayOfFiles),
      ];
    }, Promise.resolve([]));
  }

  private async getTotalSize(identifier: ResourceIdentifier): Promise<number> {
    const fileLocation = (await this.fileIdentifierMapper.mapUrlToFilePath(identifier, false)).filePath;
    // Filter out any duplicates
    const arrayOfFiles = [ ...new Set(await this.getAllFiles(fileLocation)) ];
    return arrayOfFiles.reduce((acc, current): number => acc + statSync(current).size, 0);
  }
}
