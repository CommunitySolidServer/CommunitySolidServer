import { promises as fsPromises } from 'fs';
import { posix } from 'path';
import * as mime from 'mime-types';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import { APPLICATION_OCTET_STREAM, TEXT_TURTLE } from '../util/ContentTypes';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import { UnsupportedHttpError } from '../util/errors/UnsupportedHttpError';
import {
  decodeUriPathComponents,
  encodeUriPathComponents,
  ensureTrailingSlash,
  trimTrailingSlashes,
} from '../util/PathUtil';
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
  protected readonly logger = getLoggerFor(this);

  private readonly baseRequestURI: string;
  private readonly rootFilepath: string;
  private readonly types: Record<string, any>;

  public constructor(base: string, rootFilepath: string, overrideTypes = { acl: TEXT_TURTLE, meta: TEXT_TURTLE }) {
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
    const path = this.getRelativePath(identifier);

    if (!path.startsWith('/')) {
      this.logger.warn(`URL ${identifier.path} needs a / after the base`);
      throw new UnsupportedHttpError('URL needs a / after the base');
    }

    if (path.includes('/..')) {
      this.logger.warn(`Disallowed /.. segment in URL ${identifier.path}.`);
      throw new UnsupportedHttpError('Disallowed /.. segment in URL');
    }

    let filePath = this.getAbsolutePath(path);

    // Container
    if (identifier.path.endsWith('/')) {
      this.logger.debug(`URL ${identifier.path} points to the container ${filePath}`);
      return {
        identifier,
        filePath,
      };
    }

    // Would conflict with how new extensions are stored
    if (/\$\.\w+$/u.test(filePath)) {
      this.logger.warn(`Identifier ${identifier.path} contains a dollar sign before its extension`);
      throw new UnsupportedHttpError('Identifiers cannot contain a dollar sign before their extension');
    }

    // Existing file
    if (!contentType) {
      const [ , folder, documentName ] = /^(.*\/)(.*)$/u.exec(filePath)!;

      let fileName: string | undefined;
      try {
        const files = await fsPromises.readdir(folder);
        fileName = files.find(
          (file): boolean =>
            file.startsWith(documentName) && /^(?:\$\..+)?$/u.test(file.slice(documentName.length)),
        );
      } catch {
        // Parent folder does not exist (or is not a folder)
        this.logger.warn(`No parent folder for ${identifier.path} found at ${folder}`);
        throw new NotFoundHttpError();
      }

      // File doesn't exist
      if (!fileName) {
        this.logger.warn(`File for URL ${identifier.path} does not exist in ${folder}`);
        throw new NotFoundHttpError();
      }

      filePath = joinPath(folder, fileName);
      this.logger.info(`The path for ${identifier.path} is ${filePath}`);
      return {
        identifier,
        filePath,
        contentType: this.getContentTypeFromExtension(fileName),
      };
    }

    // If the extension of the identifier matches a different content-type than the one that is given,
    // we need to add a new extension to match the correct type.
    if (contentType !== this.getContentTypeFromExtension(filePath)) {
      const extension = mime.extension(contentType);
      if (!extension) {
        this.logger.warn(`No extension found for ${contentType}`);
        throw new UnsupportedHttpError(`Unsupported content type ${contentType}`);
      }
      filePath += `$.${extension}`;
    }

    this.logger.info(`The path for ${identifier.path} is ${filePath}`);
    return {
      identifier,
      filePath,
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
      this.logger.error(`Trying to access file ${filePath} outside of ${this.rootFilepath}`);
      throw new Error(`File ${filePath} is not part of the file storage at ${this.rootFilepath}`);
    }

    let relative = filePath.slice(this.rootFilepath.length);
    if (isContainer) {
      const path = ensureTrailingSlash(this.baseRequestURI + encodeUriPathComponents(relative));
      this.logger.info(`Container filepath ${filePath} maps to URL ${path}`);
      return {
        identifier: { path },
        filePath,
      };
    }

    // Files
    const extension = this.getExtension(relative);
    const contentType = this.getContentTypeFromExtension(relative);
    if (extension && relative.endsWith(`$.${extension}`)) {
      relative = relative.slice(0, -(extension.length + 2));
    }

    const path = trimTrailingSlashes(this.baseRequestURI + encodeUriPathComponents(relative));
    this.logger.info(`File ${filePath} (${contentType}) maps to URL ${path}`);

    return {
      identifier: { path },
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
  private getRelativePath(identifier: ResourceIdentifier): string {
    if (!identifier.path.startsWith(this.baseRequestURI)) {
      this.logger.warn(`The URL ${identifier.path} is outside of the scope ${this.baseRequestURI}`);
      throw new NotFoundHttpError();
    }
    return decodeUriPathComponents(identifier.path.slice(this.baseRequestURI.length));
  }
}
