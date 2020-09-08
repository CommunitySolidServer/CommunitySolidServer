import { posix } from 'path';
import { types } from 'mime-types';
import { RuntimeConfig } from '../init/RuntimeConfig';
import { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { APPLICATION_OCTET_STREAM } from '../util/ContentTypes';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import { trimTrailingSlashes } from '../util/Util';
import { FileIdentifierMapper } from './FileIdentifierMapper';

const { join: joinPath } = posix;

export class ExtensionBasedMapper implements FileIdentifierMapper {
  private readonly baseRequestURI: string;
  private readonly rootFilepath: string;
  private readonly types: Record<string, any>;

  public constructor(runtimeConfig: RuntimeConfig, overrideTypes = { acl: 'text/turtle', metadata: 'text/turtle' }) {
    this.baseRequestURI = trimTrailingSlashes(runtimeConfig.base);
    this.rootFilepath = trimTrailingSlashes(runtimeConfig.rootFilepath);
    this.types = { ...types, ...overrideTypes };
  }

  /**
   * Strips the baseRequestURI from the identifier and checks if the stripped base URI matches the store's one.
   * @param identifier - Incoming identifier.
   *
   * @throws {@link NotFoundHttpError}
   * If the identifier does not match the baseRequestURI path of the store.
   */
  public mapUrlToFilePath(identifier: ResourceIdentifier, id = ''): string {
    return this.getAbsolutePath(this.parseIdentifier(identifier), id);
  }

  /**
   * Strips the rootFilepath path from the filepath and adds the baseRequestURI in front of it.
   * @param path - The filepath.
   *
   * @throws {@Link Error}
   * If the filepath does not match the rootFilepath path of the store.
   */
  public mapFilePathToUrl(path: string): string {
    if (!path.startsWith(this.rootFilepath)) {
      throw new Error(`File ${path} is not part of the file storage at ${this.rootFilepath}.`);
    }
    return this.baseRequestURI + path.slice(this.rootFilepath.length);
  }

  public getContentTypeFromExtension(path: string): string {
    const extension = /\.([^./]+)$/u.exec(path);
    return (extension && this.types[extension[1].toLowerCase()]) || APPLICATION_OCTET_STREAM;
  }

  public getAbsolutePath(path: string, identifier = ''): string {
    return joinPath(this.rootFilepath, path, identifier);
  }

  public parseIdentifier(identifier: ResourceIdentifier): string {
    if (!identifier.path.startsWith(this.baseRequestURI)) {
      throw new NotFoundHttpError();
    }
    return identifier.path.slice(this.baseRequestURI.length);
  }

  public parseIdentifierNormalized(identifier: ResourceIdentifier): string[] {
    return /^(.*\/)([^/]+\/?)?$/u.exec(this.parseIdentifier(identifier)) ?? [];
  }
}
