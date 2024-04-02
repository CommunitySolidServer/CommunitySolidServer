import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';

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
   * Content-type for a document (not defined for containers).
   */
  contentType?: string;
  /**
   * If the resource is a metadata file.
   */
  isMetadata: boolean;
}

/**
 * Supports mapping a file to an URL and back.
 */
export interface FileIdentifierMapper {
  /**
   * Maps the given file path to an URL and determines the content-type
   *
   * @param filePath - The input file path.
   * @param isContainer - If the path corresponds to a file.
   *
   * @returns A ResourceLink with all the necessary metadata.
   */
  mapFilePathToUrl: (filePath: string, isContainer: boolean) => Promise<ResourceLink>;
  /**
   * Maps the given resource identifier / URL to a file path.
   * Determines the content-type, if no content-type was provided, by finding the corresponding file.
   * If there is no corresponding file, a file path will be generated.
   * For containers, the content-type input gets ignored.
   *
   * @param identifier - The input identifier.
   * @param isMetadata - If we are mapping the metadata of the resource instead of its data.
   * @param contentType - The (optional) content-type of the resource.
   *
   * @returns A ResourceLink with all the necessary metadata.
   */
  mapUrlToFilePath: (identifier: ResourceIdentifier, isMetadata: boolean, contentType?: string) =>
  Promise<ResourceLink>;
}

/**
 * Factory that can create FileIdentifierMappers so the base and rootFilePath can be set dynamically.
 * Specifically used when identifiers need to be generated for a new pod (since pod identifiers are generated).
 */
export interface FileIdentifierMapperFactory<T extends FileIdentifierMapper = FileIdentifierMapper> {
  create: (base: string, rootFilePath: string) => Promise<T>;
}
