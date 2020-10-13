import { promises as fsPromises } from 'fs';
import { posix } from 'path';
import * as mime from 'mime-types';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { APPLICATION_OCTET_STREAM, TEXT_TURTLE } from '../util/ContentTypes';
import { ConflictHttpError } from '../util/errors/ConflictHttpError';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import { UnsupportedHttpError } from '../util/errors/UnsupportedHttpError';
import {
  decodeUriPathComponents,
  encodeUriPathComponents,
  ensureTrailingSlash,
  trimTrailingSlashes,
} from '../util/Util';
import type { FileIdentifierMapper, ResourceLink } from './FileIdentifierMapper';

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

/**
 * A mapper that stores the content-type of resources in the file path extension.
 * In case the extension of the identifier does not correspond to the correct content-type,
 * a new extension will be appended (with a `$` in front of it).
 * E.g. if the path is `input.ttl` with content-type `text/plain`, the path would actually be `input.ttl$.txt`.
 * This new extension is stripped again when generating an identifier.
 */
export class ExtensionBasedMapper implements FileIdentifierMapper {
  private readonly baseRequestURI: string;
  private readonly rootFilepath: string;
  private readonly types: Record<string, any>;

  public constructor(base: string, rootFilepath: string, overrideTypes = { acl: TEXT_TURTLE, metadata: TEXT_TURTLE }) {
    this.baseRequestURI = trimTrailingSlashes(base);
    this.rootFilepath = trimTrailingSlashes(normalizePath(rootFilepath));
    this.types = { ...mime.types, ...overrideTypes };
  }

  /**
   * Maps the given resource identifier / URL to a file path.
   * Determines the content-type if no content-type was provided.
   * For containers the content-type input gets ignored.
   * @param identifier - The input identifier.
   * @param contentType - The (optional) content-type of the resource.
   *
   * @returns A ResourceLink with all the necessary metadata.
   */
  public async mapUrlToFilePath(identifier: ResourceIdentifier, contentType?: string): Promise<ResourceLink> {
    let path = this.getRelativePath(identifier);

    if (!path.startsWith('/')) {
      throw new UnsupportedHttpError('URL needs a / after the base.');
    }

    if (path.includes('/..')) {
      throw new UnsupportedHttpError('Disallowed /.. segment in URL.');
    }

    path = this.getAbsolutePath(path);

    // Container
    if (identifier.path.endsWith('/')) {
      return {
        identifier,
        filePath: path,
      };
    }

    // Would conflict with how new extensions get stored
    if (/\$\.\w+$/u.test(path)) {
      throw new UnsupportedHttpError('Identifiers cannot contain a dollar sign before their extension.');
    }

    // Existing file
    if (!contentType) {
      const [ , folder, documentName ] = /^(.*\/)(.*)$/u.exec(path)!;

      let fileName: string | undefined;
      try {
        const files = await fsPromises.readdir(folder);
        fileName = files.find(
          (file): boolean =>
            file.startsWith(documentName) && /^(?:\$\..+)?$/u.test(file.slice(documentName.length)),
        );
      } catch {
        // Parent folder does not exist (or is not a folder)
        throw new NotFoundHttpError();
      }

      // File doesn't exist
      if (!fileName) {
        throw new NotFoundHttpError();
      }

      return {
        identifier,
        filePath: joinPath(folder, fileName),
        contentType: this.getContentTypeFromExtension(fileName),
      };
    }

    // If the extension of the identifier matches a different content-type than the one that is given,
    // we need to add a new extension to match the correct type.
    if (contentType !== this.getContentTypeFromExtension(path)) {
      const extension = mime.extension(contentType);
      if (!extension) {
        throw new UnsupportedHttpError(`Unsupported content-type ${contentType}.`);
      }
      path = `${path}$.${extension}`;
    }

    return {
      identifier,
      filePath: path,
      contentType,
    };
  }

  /**
   * Maps the given file path to an URL and determines the content-type
   * @param filePath - The input file path.
   * @param isContainer - If the path corresponds to a file.
   *
   * @returns A ResourceLink with all the necessary metadata.
   */
  public async mapFilePathToUrl(filePath: string, isContainer: boolean): Promise<ResourceLink> {
    if (!filePath.startsWith(this.rootFilepath)) {
      throw new Error(`File ${filePath} is not part of the file storage at ${this.rootFilepath}.`);
    }

    let relative = filePath.slice(this.rootFilepath.length);
    if (isContainer) {
      return {
        identifier: { path: ensureTrailingSlash(this.baseRequestURI + encodeUriPathComponents(relative)) },
        filePath,
      };
    }

    // Files
    const extension = this.getExtension(relative);
    const contentType = this.getContentTypeFromExtension(relative);
    if (extension && relative.endsWith(`$.${extension}`)) {
      relative = relative.slice(0, -(extension.length + 2));
    }

    return {
      identifier: { path: trimTrailingSlashes(this.baseRequestURI + encodeUriPathComponents(relative)) },
      filePath,
      contentType,
    };
  }

  /**
   * Get the content type from a file path, using its extension.
   * @param path - The file path.
   *
   * @returns Content type of the file.
   */
  private getContentTypeFromExtension(path: string): string {
    const extension = this.getExtension(path);
    return (extension && this.types[extension.toLowerCase()]) || APPLICATION_OCTET_STREAM;
  }

  /**
   * Extracts the extension (without dot) from a path.
   * Custom functin since `path.extname` does not work on all cases (e.g. ".acl")
   * @param path - Input path to parse.
   */
  private getExtension(path: string): string | null {
    const extension = /\.([^./]+)$/u.exec(path);
    return extension && extension[1];
  }

  /**
   * Get the absolute file path based on the rootFilepath of the store.
   * @param path - The relative file path.
   * @param identifier - Optional identifier to add to the path.
   *
   * @returns Absolute path of the file.
   */
  private getAbsolutePath(path: string, identifier = ''): string {
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
    return decodeUriPathComponents(identifier.path.slice(this.baseRequestURI.length));
  }

  /**
   * Splits the identifier into the parent directory and slug.
   * If the identifier specifies a directory, slug will be undefined.
   * @param identifier - Incoming identifier.
   *
   * @throws {@link ConflictHttpError}
   * If the root identifier is passed.
   *
   * @returns A ResourcePath object containing (absolute) path and (optional) slug fields.
   */
  public extractDocumentName(identifier: ResourceIdentifier): ResourcePath {
    const [ , containerPath, documentName ] = /^(.*\/)([^/]+\/?)?$/u.exec(this.getRelativePath(identifier)) ?? [];
    if (
      (typeof containerPath !== 'string' || normalizePath(containerPath) === '/') && typeof documentName !== 'string') {
      throw new ConflictHttpError('Container with that identifier already exists (root).');
    }
    return {
      containerPath: this.getAbsolutePath(normalizePath(containerPath)),

      // If documentName is defined, return normalized documentName
      documentName: typeof documentName === 'string' ? normalizePath(documentName) : undefined,
    };
  }
}
