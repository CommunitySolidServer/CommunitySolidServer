import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import { APPLICATION_OCTET_STREAM } from '../../util/ContentTypes';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { ConflictHttpError } from '../../util/errors/ConflictHttpError';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import {
  decodeUriPathComponents,
  encodeUriPathComponents,
  ensureTrailingSlash,
  isContainerIdentifier,
  joinFilePath,
  normalizeFilePath,
  trimTrailingSlashes,
} from '../../util/PathUtil';
import type { FileIdentifierMapper, ResourceLink } from './FileIdentifierMapper';

/**
 * Base class for {@link FileIdentifierMapper} implementations.
 */
export class BaseFileIdentifierMapper implements FileIdentifierMapper {
  protected readonly logger = getLoggerFor(this);
  protected readonly baseRequestURI: string;
  protected readonly rootFilepath: string;

  public constructor(base: string, rootFilepath: string) {
    this.baseRequestURI = trimTrailingSlashes(base);
    this.rootFilepath = trimTrailingSlashes(normalizeFilePath(rootFilepath));
  }

  /**
   * Maps the given resource identifier / URL to a file path.
   * Determines the content type if none was provided.
   * For containers the content-type input is ignored.
   * @param identifier - The input identifier.
   * @param isMetadata - If we need the data or metadata file path.
   * @param contentType - The content-type provided with the request.
   *
   * @returns A ResourceLink with all the necessary metadata.
   */
  public async mapUrlToFilePath(identifier: ResourceIdentifier, isMetadata: boolean, contentType?: string):
  Promise<ResourceLink> {
    // Technically we could allow paths ending on .meta as long as we make sure there is never a mixup.
    // But this can lead to potential issues.
    // This also immediately stops users that expect they can update metadata like this.
    if (this.isMetadataPath(identifier.path)) {
      throw new ConflictHttpError('Not allowed to create files with the metadata extension.');
    }
    let path = this.getRelativePath(identifier);
    if (isMetadata) {
      path += '.meta';
    }
    this.validateRelativePath(path, identifier);

    const filePath = this.getAbsolutePath(path);
    return isContainerIdentifier(identifier) ?
      this.mapUrlToContainerPath(identifier, filePath) :
      this.mapUrlToDocumentPath(identifier, filePath, contentType);
  }

  /**
   * Maps the given container identifier to a file path,
   * possibly making alterations to the direct translation.
   * @param identifier - The input identifier.
   * @param filePath - The direct translation of the identifier onto the file path.
   *
   * @returns A ResourceLink with all the necessary metadata.
   */
  protected async mapUrlToContainerPath(identifier: ResourceIdentifier, filePath: string): Promise<ResourceLink> {
    this.logger.debug(`URL ${identifier.path} points to the container ${filePath}`);
    return { identifier, filePath, isMetadata: this.isMetadataPath(filePath) };
  }

  /**
   * Maps the given document identifier to a file path,
   * possibly making alterations to the direct translation
   * (for instance, based on its content type)).
   * Determines the content type if none was provided.
   * @param identifier - The input identifier.
   * @param filePath - The direct translation of the identifier onto the file path.
   * @param contentType - The content-type provided with the request.
   *
   * @returns A ResourceLink with all the necessary metadata.
   */
  protected async mapUrlToDocumentPath(identifier: ResourceIdentifier, filePath: string, contentType?: string):
  Promise<ResourceLink> {
    contentType = await this.getContentTypeFromUrl(identifier, contentType);
    this.logger.debug(`The path for ${identifier.path} is ${filePath}`);
    return { identifier, filePath, contentType, isMetadata: this.isMetadataPath(filePath) };
  }

  /**
   * Determines the content type from the document identifier.
   * @param identifier - The input identifier.
   * @param contentType - The content-type provided with the request.
   *
   * @returns The content type of the document.
   */
  protected async getContentTypeFromUrl(identifier: ResourceIdentifier, contentType?: string): Promise<string> {
    return contentType ?? APPLICATION_OCTET_STREAM;
  }

  /**
   * Maps the given file path to a URL and determines its content type.
   * @param filePath - The input file path.
   * @param isContainer - If the path corresponds to a file.
   *
   * @returns A ResourceLink with all the necessary metadata.
   */
  public async mapFilePathToUrl(filePath: string, isContainer: boolean): Promise<ResourceLink> {
    if (!filePath.startsWith(this.rootFilepath)) {
      this.logger.error(`Trying to access file ${filePath} outside of ${this.rootFilepath}`);
      throw new InternalServerError(`File ${filePath} is not part of the file storage at ${this.rootFilepath}`);
    }
    const relative = filePath.slice(this.rootFilepath.length);
    let url: string;
    let contentType: string | undefined;

    if (isContainer) {
      url = await this.getContainerUrl(relative);
      this.logger.debug(`Container filepath ${filePath} maps to URL ${url}`);
    } else {
      url = await this.getDocumentUrl(relative);
      this.logger.debug(`Document ${filePath} maps to URL ${url}`);
      contentType = await this.getContentTypeFromPath(filePath);
    }
    const isMetadata = this.isMetadataPath(filePath);
    if (isMetadata) {
      url = url.slice(0, -'.meta'.length);
    }
    return { identifier: { path: url }, filePath, contentType, isMetadata };
  }

  /**
   * Maps the given container path to a URL and determines its content type.
   * @param relative - The relative container path.
   *
   * @returns A ResourceLink with all the necessary metadata.
   */
  protected async getContainerUrl(relative: string): Promise<string> {
    return ensureTrailingSlash(this.baseRequestURI + encodeUriPathComponents(relative));
  }

  /**
   * Maps the given document path to a URL and determines its content type.
   * @param relative - The relative document path.
   *
   * @returns A ResourceLink with all the necessary metadata.
   */
  protected async getDocumentUrl(relative: string): Promise<string> {
    return trimTrailingSlashes(this.baseRequestURI + encodeUriPathComponents(relative));
  }

  /**
   * Determines the content type from the relative path.
   * @param filePath - The file path of the document.
   *
   * @returns The content type of the document.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async getContentTypeFromPath(filePath: string): Promise<string> {
    return APPLICATION_OCTET_STREAM;
  }

  /**
   * Get the absolute file path based on the rootFilepath.
   * @param path - The relative file path.
   *
   * @returns Absolute path of the file.
   */
  protected getAbsolutePath(path: string): string {
    return joinFilePath(this.rootFilepath, path);
  }

  /**
   * Strips the baseRequestURI from the identifier.
   * @param identifier - Incoming identifier.
   *
   * @throws {@link NotFoundHttpError}
   * If the identifier does not match the baseRequestURI.
   *
   * @returns A string representing the relative path.
   */
  protected getRelativePath(identifier: ResourceIdentifier): string {
    if (!identifier.path.startsWith(this.baseRequestURI)) {
      this.logger.warn(`The URL ${identifier.path} is outside of the scope ${this.baseRequestURI}`);
      throw new NotFoundHttpError();
    }
    return decodeUriPathComponents(identifier.path.slice(this.baseRequestURI.length));
  }

  /**
   * Check if the given relative path is valid.
   *
   * @throws {@link BadRequestHttpError}
   * If the relative path is invalid.
   *
   * @param path - A relative path, as generated by {@link getRelativePath}.
   * @param identifier - A resource identifier.
   */
  protected validateRelativePath(path: string, identifier: ResourceIdentifier): void {
    if (!path.startsWith('/')) {
      this.logger.warn(`URL ${identifier.path} needs a / after the base`);
      throw new BadRequestHttpError('URL needs a / after the base');
    }

    if (path.includes('/..')) {
      this.logger.warn(`Disallowed /.. segment in URL ${identifier.path}.`);
      throw new BadRequestHttpError('Disallowed /.. segment in URL');
    }
  }

  /**
   * Checks if the given path is a metadata path.
   */
  protected isMetadataPath(path: string): boolean {
    return path.endsWith('.meta');
  }
}
