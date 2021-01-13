import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { BaseFileIdentifierMapper } from './BaseFileIdentifierMapper';

export class FixedContentTypeMapper extends BaseFileIdentifierMapper {
  protected readonly contentType: string;

  public constructor(base: string, rootFilepath: string, contentType: string) {
    super(base, rootFilepath);
    this.contentType = contentType;
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
}
