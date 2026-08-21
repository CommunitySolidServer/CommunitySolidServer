import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { decodeUriPathComponents, ensureTrailingSlash, joinUrl } from '../../util/PathUtil';
import type { FileIdentifierMapper, ResourceLink } from './FileIdentifierMapper';

/**
 * Provides the content types for resources stored in a specific container.
 */
export class ContainerContentTypeMapper implements FileIdentifierMapper {
  private readonly containerUrl: string;

  public constructor(
    private readonly source: FileIdentifierMapper,
    baseUrl: string,
    container: string,
    private readonly documentContentType: string,
    private readonly metadataContentType: string,
  ) {
    this.containerUrl = decodeUriPathComponents(ensureTrailingSlash(joinUrl(baseUrl, container)));
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
    try {
      return decodeUriPathComponents(identifier.path).startsWith(this.containerUrl);
    } catch {
      return false;
    }
  }
}
