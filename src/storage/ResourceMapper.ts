import { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';

/**
 * Supports mapping a file to an URL and back.
 */
export interface ResourceMapper {
  /**
   * Maps the given file path to an URL.
   * @param file - The input file path.
   *
   * @returns The URL as a string.
   */
  mapFilePathToUrl: (filePath: string) => string;
  /**
   * Maps the given resource identifier / URL to a file path.
   * @param url - The input URL.
   *
   * @returns The file path as a string.
   */
  mapUrlToFilePath: (identifier: ResourceIdentifier) => string;
  /**
   * Maps the given path to a contentType;
   * @param path - The input file path.
   *
   * @returns The content type as a string.
   */
  getContentTypeFromExtension: (path: string) => string;
}
