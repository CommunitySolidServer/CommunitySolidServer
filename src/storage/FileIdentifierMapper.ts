import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';

export interface ResourceLink {
  /**
   * Identifier of a resource.
   */
  identifier: ResourceIdentifier;
  /**
   * File path of a resource.
   */
  filePath: string;
  /**
   * Content-type for a data resource (not defined for containers).
   */
  contentType?: string;
}

/**
 * Supports mapping a file to an URL and back.
 */
export interface FileIdentifierMapper {
  /**
   * Maps the given file path to an URL and determines the content-type
   * @param filePath - The input file path.
   * @param isContainer - If the path corresponds to a file.
   *
   * @returns A ResourceLink with all the necessary metadata.
   */
  mapFilePathToUrl: (filePath: string, isContainer: boolean) => Promise<ResourceLink>;
  /**
   * Maps the given resource identifier / URL to a file path.
   * Determines the content-type if no content-type was provided.
   * For containers the content-type input gets ignored.
   * @param identifier - The input identifier.
   * @param contentType - The (optional) content-type of the resource.
   *
   * @returns A ResourceLink with all the necessary metadata.
   */
  mapUrlToFilePath: (identifier: ResourceIdentifier, contentType?: string) => Promise<ResourceLink>;
}
