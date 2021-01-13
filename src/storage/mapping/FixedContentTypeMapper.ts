import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import {
  encodeUriPathComponents,
  ensureTrailingSlash,
  isContainerIdentifier,
  normalizeFilePath,
  trimTrailingSlashes,
} from '../../util/PathUtil';
import type { FileIdentifierMapper, ResourceLink } from './FileIdentifierMapper';
import { getAbsolutePath, getRelativePath, validateRelativePath } from './MapperUtil';

/**
 * A mapper that always returns a fixed content type for files.
 */
export class FixedContentTypeMapper implements FileIdentifierMapper {
  protected readonly logger = getLoggerFor(this);

  private readonly baseRequestURI: string;
  private readonly rootFilepath: string;
  private readonly contentType: string;

  public constructor(base: string, rootFilepath: string, contentType: string) {
    this.baseRequestURI = trimTrailingSlashes(base);
    this.rootFilepath = trimTrailingSlashes(normalizeFilePath(rootFilepath));
    this.contentType = contentType;
  }

  public async mapUrlToFilePath(identifier: ResourceIdentifier, contentType?: string): Promise<ResourceLink> {
    const path = getRelativePath(this.baseRequestURI, identifier);
    validateRelativePath(path, identifier);

    const filePath = getAbsolutePath(this.rootFilepath, path);

    // Container
    if (isContainerIdentifier(identifier)) {
      this.logger.debug(`URL ${identifier.path} points to the container ${filePath}`);
      return {
        identifier,
        filePath,
      };
    }

    // Only allow the configured content type
    if (contentType && contentType !== this.contentType) {
      throw new NotImplementedHttpError(`Unsupported content type ${contentType}, only ${this.contentType} is allowed`);
    }

    this.logger.debug(`The path for ${identifier.path} is ${filePath}`);
    return {
      identifier,
      filePath,
      contentType: this.contentType,
    };
  }

  public async mapFilePathToUrl(filePath: string, isContainer: boolean): Promise<ResourceLink> {
    if (!filePath.startsWith(this.rootFilepath)) {
      this.logger.error(`Trying to access file ${filePath} outside of ${this.rootFilepath}`);
      throw new Error(`File ${filePath} is not part of the file storage at ${this.rootFilepath}`);
    }

    const relative = filePath.slice(this.rootFilepath.length);
    if (isContainer) {
      const path = ensureTrailingSlash(this.baseRequestURI + encodeUriPathComponents(relative));
      this.logger.debug(`Container filepath ${filePath} maps to URL ${path}`);
      return {
        identifier: { path },
        filePath,
      };
    }

    const path = trimTrailingSlashes(this.baseRequestURI + encodeUriPathComponents(relative));
    this.logger.debug(`File ${filePath} maps to URL ${path}`);

    return {
      identifier: { path },
      filePath,
      contentType: this.contentType,
    };
  }
}
