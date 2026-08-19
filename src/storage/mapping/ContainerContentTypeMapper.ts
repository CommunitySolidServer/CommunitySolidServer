import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { decodeUriPathComponents, ensureTrailingSlash, joinUrl, trimTrailingSlashes } from '../../util/PathUtil';
import type { FileIdentifierMapper, ResourceLink } from './FileIdentifierMapper';

/**
 * Provides the content types for resources stored in a specific container.
 */
export class ContainerContentTypeMapper implements FileIdentifierMapper {
  private readonly source: FileIdentifierMapper;
  private readonly documentContentType: string;
  private readonly metadataContentType: string;
  private readonly baseUrl: string;
  private readonly containerPath: string;

  public constructor(
    source: FileIdentifierMapper,
    baseUrl: string,
    container: string,
    documentContentType: string,
    metadataContentType: string,
  ) {
    this.source = source;
    this.documentContentType = documentContentType;
    this.metadataContentType = metadataContentType;
    this.baseUrl = trimTrailingSlashes(baseUrl);
    const containerUrl = ensureTrailingSlash(joinUrl(baseUrl, container));
    this.containerPath = decodeUriPathComponents(containerUrl.slice(this.baseUrl.length));
  }

  public async mapUrlToFilePath(identifier: ResourceIdentifier, isMetadata: boolean, contentType?: string):
  Promise<ResourceLink> {
    if (this.isContained(identifier)) {
      const storedContentType = isMetadata ? this.metadataContentType : this.documentContentType;
      if (contentType && contentType !== storedContentType) {
        throw new NotImplementedHttpError(
          `Unsupported content type ${contentType}, only ${storedContentType} is allowed`,
        );
      }
      contentType = storedContentType;
    }
    return this.source.mapUrlToFilePath(identifier, isMetadata, contentType);
  }

  public async mapFilePathToUrl(filePath: string, isContainer: boolean): Promise<ResourceLink> {
    return this.source.mapFilePathToUrl(filePath, isContainer);
  }

  private isContained(identifier: ResourceIdentifier): boolean {
    if (!identifier.path.startsWith(this.baseUrl)) {
      return false;
    }
    try {
      return decodeUriPathComponents(identifier.path.slice(this.baseUrl.length)).startsWith(this.containerPath);
    } catch {
      return false;
    }
  }
}
