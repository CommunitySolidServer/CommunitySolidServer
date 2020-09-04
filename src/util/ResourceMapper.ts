import { types } from 'mime-types';

// This class could contain more URL/file mapping logic.
export class ResourceMapper {
  private readonly types: Record<string, any>;

  public constructor(
    overrideTypes = { acl: 'text/turtle', metadata: 'text/turtle' },
  ) {
    this.types = { ...types, ...overrideTypes };
  }

  // Could also use getContentTypeFromExtension so line 221 in file store unit tests
  // can stay 'text/plain; charset=utf-8'
  public getContentTypeFromExtension(path: string): string {
    const extension = /\.([^./]+)$/u.exec(path);
    return (extension && this.types[extension[1].toLowerCase()]) || false;
  }
}
