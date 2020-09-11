import { posix } from 'path';
import { types } from 'mime-types';
import { RuntimeConfig } from '../init/RuntimeConfig';
import { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { APPLICATION_OCTET_STREAM, TEXT_TURTLE } from '../util/ContentTypes';
import { ConflictHttpError } from '../util/errors/ConflictHttpError';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import { trimTrailingSlashes } from '../util/Util';
import { FileIdentifierMapper } from './FileIdentifierMapper';

const { join: joinPath, normalize: normalizePath } = posix;

export interface ResourcePath {

  /**
   * The path of the container.
   */
  containerPath: string;

  /**
   * The document name.
   */
  documentName?: string;
}

export class ExtensionBasedMapper implements FileIdentifierMapper {
  private readonly runtimeConfig: RuntimeConfig;
  private readonly types: Record<string, any>;

  public constructor(runtimeConfig: RuntimeConfig, overrideTypes = { acl: TEXT_TURTLE, metadata: TEXT_TURTLE }) {
    this.runtimeConfig = runtimeConfig;
    this.types = { ...types, ...overrideTypes };
  }

  // Using getters because the values of runtimeConfig get filled in at runtime (so they are still empty at
  // construction time until issue #106 gets resolved.)
  public get baseRequestURI(): string {
    return trimTrailingSlashes(this.runtimeConfig.base);
  }

  public get rootFilepath(): string {
    return trimTrailingSlashes(this.runtimeConfig.rootFilepath);
  }

  /**
   * Strips the baseRequestURI from the identifier and checks if the stripped base URI matches the store's one.
   * @param identifier - Incoming identifier.
   *
   * @throws {@link NotFoundHttpError}
   * If the identifier does not match the baseRequestURI path of the store.
   *
   * @returns Absolute path of the file.
   */
  public mapUrlToFilePath(identifier: ResourceIdentifier, id = ''): string {
    return this.getAbsolutePath(this.getRelativePath(identifier), id);
  }

  /**
   * Strips the rootFilepath path from the filepath and adds the baseRequestURI in front of it.
   * @param path - The file path.
   *
   * @throws {@Link Error}
   * If the file path does not match the rootFilepath path of the store.
   *
   * @returns Url of the file.
   */
  public mapFilePathToUrl(path: string): string {
    if (!path.startsWith(this.rootFilepath)) {
      throw new Error(`File ${path} is not part of the file storage at ${this.rootFilepath}.`);
    }
    return this.baseRequestURI + path.slice(this.rootFilepath.length);
  }

  /**
   * Get the content type from a file path, using its extension.
   * @param path - The file path.
   *
   * @returns Content type of the file.
   */
  public getContentTypeFromExtension(path: string): string {
    const extension = /\.([^./]+)$/u.exec(path);
    return (extension && this.types[extension[1].toLowerCase()]) || APPLICATION_OCTET_STREAM;
  }

  /**
   * Get the absolute file path based on the rootFilepath of the store.
   * @param path - The relative file path.
   * @param identifier - Optional identifier to add to the path.
   *
   * @returns Absolute path of the file.
   */
  public getAbsolutePath(path: string, identifier = ''): string {
    return joinPath(this.rootFilepath, path, identifier);
  }

  /**
   * Strips the baseRequestURI from the identifier and checks if the stripped base URI matches the store's one.
   * @param identifier - Incoming identifier.
   *
   * @throws {@link NotFoundHttpError}
   * If the identifier does not match the baseRequestURI path of the store.
   *
   * @returns A string representing the relative path.
   */
  public getRelativePath(identifier: ResourceIdentifier): string {
    if (!identifier.path.startsWith(this.baseRequestURI)) {
      throw new NotFoundHttpError();
    }
    return identifier.path.slice(this.baseRequestURI.length);
  }

  /**
   * Splits the identifier into the parent directory and slug.
   * If the identifier specifies a directory, slug will be undefined.
   * @param identifier - Incoming identifier.
   *
   * @throws {@link ConflictHttpError}
   * If the root identifier is passed.
   *
   * @returns A ResourcePath object containing path and (optional) slug fields.
   */
  public exctractDocumentName(identifier: ResourceIdentifier): ResourcePath {
    const [ , containerPath, documentName ] = /^(.*\/)([^/]+\/?)?$/u.exec(this.getRelativePath(identifier)) ?? [];
    if (
      (typeof containerPath !== 'string' || normalizePath(containerPath) === '/') && typeof documentName !== 'string') {
      throw new ConflictHttpError('Container with that identifier already exists (root).');
    }
    return {
      containerPath: normalizePath(containerPath),

      // If documentName is not undefined, return normalized documentName
      documentName: typeof documentName === 'string' ? normalizePath(documentName) : undefined,
    };
  }
}
