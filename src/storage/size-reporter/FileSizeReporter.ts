import type { Stats } from 'fs';
import { promises as fsPromises } from 'fs';
import type { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { joinFilePath, normalizeFilePath, trimTrailingSlashes } from '../../util/PathUtil';
import type { FileIdentifierMapper } from '../mapping/FileIdentifierMapper';
import type { Size } from './Size';
import type { SizeReporter } from './SizeReporter';

/**
 * SizeReporter that is used to calculate sizes of resources for a file based system
 */
export class FileSizeReporter implements SizeReporter<string> {
  private readonly fileIdentifierMapper: FileIdentifierMapper;
  private readonly ignoreFolders: RegExp[];
  private readonly rootFilePath: string;

  public constructor(fileIdentifierMapper: FileIdentifierMapper, rootFilePath: string, ignoreFolders: string[]) {
    this.fileIdentifierMapper = fileIdentifierMapper;
    this.ignoreFolders = ignoreFolders.map((folder: string): RegExp => new RegExp(folder, 'u'));
    this.rootFilePath = normalizeFilePath(rootFilePath);
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

  public async calculateChunkSize(chunk: string): Promise<number> {
    return chunk.length;
  }

  /** The estimated size of a resource in this reporter is simply the content-length header */
  public estimateSize = async(metadata: RepresentationMetadata): Promise<number | undefined> => metadata.contentLength;

  /**
   * Get the total size of a resource and its children if present
   *
   * @param fileLocation - the resource of which you want the total size of ( on disk )
   * @returns a number specifying how many bytes are used by the resource
   */
  private async getTotalSize(fileLocation: string): Promise<number> {
    let stat: Stats;

    // Check if the file exists
    try {
      stat = await fsPromises.stat(fileLocation);
    } catch {
      return 0;
    }

    console.log('statSize', { fileLocation, size: stat.size });

    // If the file's location points to a file, simply return the file's size
    if (stat.isFile()) {
      return stat.size;
    }

    // If the location DOES exist and is NOT a file it should be a directory
    // recursively add all sizes of children to the total
    const childFiles = await fsPromises.readdir(fileLocation);

    return await childFiles.reduce(async(acc: Promise<number>, current): Promise<number> => {
      const childFileLocation = normalizeFilePath(joinFilePath(fileLocation, current));
      let result = await acc;

      // Exclude internal files
      if (!this.ignoreFolders.some((folder: RegExp): boolean =>
        folder.test(childFileLocation.split(trimTrailingSlashes(this.rootFilePath))[1]))) {
        result += await this.getTotalSize(childFileLocation);
      }

      return result;
    }, Promise.resolve(stat.size));
  }
}
