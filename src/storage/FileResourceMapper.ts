import { types } from 'mime-types';
import { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import { FileResourceStore } from './FileResourceStore';
import { ResourceMapper } from './ResourceMapper';

export class FileResourceMapper implements ResourceMapper {
  private readonly fileStore: FileResourceStore;
  private readonly types: Record<string, any>;

  public constructor(fileStore: FileResourceStore, overrideTypes = { acl: 'text/turtle', metadata: 'text/turtle' }) {
    this.fileStore = fileStore;
    this.types = { ...types, ...overrideTypes };
  }

  /**
   * Strips the baseRequestURI from the identifier and checks if the stripped base URI matches the store's one.
   * @param identifier - Incoming identifier.
   *
   * @throws {@link NotFoundHttpError}
   * If the identifier does not match the baseRequestURI path of the store.
   */
  public mapUrlToFilePath(identifier: ResourceIdentifier): string {
    if (!identifier.path.startsWith(this.fileStore.baseRequestURI)) {
      throw new NotFoundHttpError();
    }
    return identifier.path.slice(this.fileStore.baseRequestURI.length);
  }

  /**
   * Strips the rootFilepath path from the filepath and adds the baseRequestURI in front of it.
   * @param path - The filepath.
   *
   * @throws {@Link Error}
   * If the filepath does not match the rootFilepath path of the store.
   */
  public mapFilePathToUrl(path: string): string {
    if (!path.startsWith(this.fileStore.rootFilepath)) {
      throw new Error(`File ${path} is not part of the file storage at ${this.fileStore.rootFilepath}.`);
    }
    return this.fileStore.baseRequestURI + path.slice(this.fileStore.rootFilepath.length);
  }

  public getContentTypeFromExtension(path: string): string {
    const extension = /\.([^./]+)$/u.exec(path);
    return (extension && this.types[extension[1].toLowerCase()]) || false;
  }
}
