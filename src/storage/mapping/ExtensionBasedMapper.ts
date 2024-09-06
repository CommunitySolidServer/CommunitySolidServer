import { promises as fsPromises } from 'node:fs';
import * as mime from 'mime-types';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { DEFAULT_CUSTOM_TYPES } from '../../util/ContentTypes';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { getExtension, joinFilePath } from '../../util/PathUtil';
import { BaseFileIdentifierMapper } from './BaseFileIdentifierMapper';
import type { FileIdentifierMapperFactory, ResourceLink } from './FileIdentifierMapper';

/**
 * Supports the behaviour described in https://www.w3.org/DesignIssues/HTTPFilenameMapping.html
 * Determines content-type based on the file extension.
 * In case an identifier does not end on an extension matching its content-type,
 * the corresponding file will be appended with the correct extension, preceded by $.
 */
export class ExtensionBasedMapper extends BaseFileIdentifierMapper {
  private readonly customTypes: Record<string, string>;
  private readonly customExtensions: Record<string, string>;

  public constructor(
    base: string,
    rootFilepath: string,
    customTypes?: Record<string, string>,
  ) {
    super(base, rootFilepath);

    // Workaround for https://github.com/LinkedSoftwareDependencies/Components.js/issues/20
    if (!customTypes || Object.keys(customTypes).length === 0) {
      this.customTypes = DEFAULT_CUSTOM_TYPES;
    } else {
      this.customTypes = customTypes;
    }

    this.customExtensions = {};
    for (const [ extension, contentType ] of Object.entries(this.customTypes)) {
      this.customExtensions[contentType] = extension;
    }
  }

  protected async mapUrlToDocumentPath(identifier: ResourceIdentifier, filePath: string, contentType?: string):
  Promise<ResourceLink> {
    // Would conflict with how new extensions are stored
    if (/\$\.\w+$/u.test(filePath)) {
      this.logger.warn(`Identifier ${identifier.path} contains a dollar sign before its extension`);
      throw new NotImplementedHttpError('Identifiers cannot contain a dollar sign before their extension');
    }

    // Existing file
    if (!contentType) {
      // Find a matching file
      const [ , folder, documentName ] = /^(.*\/)([^/]*)$/u.exec(filePath)!;
      let fileName: string | undefined;
      try {
        const files = await fsPromises.readdir(folder);
        fileName = files.find((file): boolean =>
          file.startsWith(documentName) && /^(?:\$\..+)?$/u.test(file.slice(documentName.length)));
      } catch {
        // Parent folder does not exist (or is not a folder)
      }
      if (fileName) {
        filePath = joinFilePath(folder, fileName);
      }
      contentType = await this.getContentTypeFromPath(filePath);
    // If the extension of the identifier matches a different content-type than the one that is given,
    // we need to add a new extension to match the correct type.
    } else if (contentType !== await this.getContentTypeFromPath(filePath)) {
      let extension: string = mime.extension(contentType) || this.customExtensions[contentType];
      if (!extension) {
        // When no extension is found for the provided content-type, use a fallback extension.
        extension = this.unknownMediaTypeExtension;
        // Signal the fallback by setting the content-type to undefined in the output link.
        contentType = undefined;
      }
      filePath += `$.${extension}`;
    }
    return super.mapUrlToDocumentPath(identifier, filePath, contentType);
  }

  protected async getDocumentUrl(relative: string): Promise<string> {
    return super.getDocumentUrl(this.stripExtension(relative));
  }

  protected async getContentTypeFromPath(filePath: string): Promise<string> {
    const extension = getExtension(filePath).toLowerCase();
    return mime.lookup(extension) ||
      this.customTypes[extension] ||
      await super.getContentTypeFromPath(filePath);
  }

  /**
   * Helper function that removes the internal extension, one starting with $., from the given path.
   * Nothing happens if no such extension is present.
   */
  protected stripExtension(path: string): string {
    const extension = getExtension(path);
    if (extension && path.endsWith(`$.${extension}`)) {
      path = path.slice(0, -(extension.length + 2));
    }
    return path;
  }
}

export class ExtensionBasedMapperFactory implements FileIdentifierMapperFactory<ExtensionBasedMapper> {
  public async create(base: string, rootFilePath: string): Promise<ExtensionBasedMapper> {
    return new ExtensionBasedMapper(base, rootFilePath);
  }
}
