import { RepresentationMetadata } from '../ldp/representation/RepresentationMetadata';

/**
 * Supports mapping a file to an URL and back.
 */
export interface ResourceMapper {
  /**
   * Maps the given file to an URL.
   * @param file - The input file.
   *
   * @returns A promise resolving to the corresponding URL and metadata of the representation.
   */
  mapFilePathToUrl: (file: File) => Promise<{ url: URL; metadata: RepresentationMetadata }>;
  /**
   * Maps the given URL and metadata to a file.
   * @param url - The input URL.
   * @param metadata - The representation metadata.
   *
   * @returns A promise resolving to the corresponding file.
   */
  mapUrlToFilePath: (url: URL, metadata: RepresentationMetadata) => Promise<File>;
}
