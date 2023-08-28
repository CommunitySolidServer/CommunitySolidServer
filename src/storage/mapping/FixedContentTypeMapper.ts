import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { BaseFileIdentifierMapper } from './BaseFileIdentifierMapper';
import type { ResourceLink } from './FileIdentifierMapper';

/**
 * A mapper that always returns a fixed content type for files.
 */
export class FixedContentTypeMapper extends BaseFileIdentifierMapper {
  protected readonly contentType: string;
  protected readonly pathSuffix: string;
  protected readonly urlSuffix: string;

  /**
   * @param base - Base URL.
   * @param rootFilepath - Base file path.
   * @param contentType - Fixed content type that will be used for all resources.
   * @param pathSuffix - An optional suffix that will be appended to all file paths.
   *                     Requested file paths without this suffix will be rejected.
   * @param urlSuffix - An optional suffix that will be appended to all URL.
   *                    Requested URLs without this suffix will be rejected.
   */
  public constructor(
    base: string,
    rootFilepath: string,
    contentType: string,
    pathSuffix = '',
    urlSuffix = '',
  ) {
    super(base, rootFilepath);
    this.contentType = contentType;
    this.pathSuffix = pathSuffix;
    this.urlSuffix = urlSuffix;
  }

  protected async getContentTypeFromUrl(identifier: ResourceIdentifier, contentType?: string): Promise<string> {
    // Only allow the configured content type
    if (contentType && contentType !== this.contentType) {
      throw new NotImplementedHttpError(`Unsupported content type ${contentType}, only ${this.contentType} is allowed`);
    }
    return this.contentType;
  }

  protected async getContentTypeFromPath(): Promise<string> {
    return this.contentType;
  }

  public async mapUrlToDocumentPath(identifier: ResourceIdentifier, filePath: string, contentType?: string):
  Promise<ResourceLink> {
    // Handle URL suffix
    if (this.urlSuffix) {
      if (filePath.endsWith(this.urlSuffix)) {
        filePath = filePath.slice(0, -this.urlSuffix.length);
      } else {
        this.logger.warn(`Trying to access URL ${filePath} outside without required suffix ${this.urlSuffix}`);
        throw new NotFoundHttpError(
          `Trying to access URL ${filePath} outside without required suffix ${this.urlSuffix}`,
        );
      }
    }

    return super.mapUrlToDocumentPath(identifier, filePath + this.pathSuffix, contentType);
  }

  protected async getDocumentUrl(relative: string): Promise<string> {
    // Handle path suffix, but ignore metadata files
    if (this.pathSuffix && !this.isMetadataPath(relative)) {
      if (relative.endsWith(this.pathSuffix)) {
        relative = relative.slice(0, -this.pathSuffix.length);
      } else {
        this.logger.warn(`Trying to access file ${relative} outside without required suffix ${this.pathSuffix}`);
        throw new NotFoundHttpError(`File ${relative} is not part of the file storage at ${this.rootFilepath}`);
      }
    }

    return super.getDocumentUrl(relative + this.urlSuffix);
  }
}
