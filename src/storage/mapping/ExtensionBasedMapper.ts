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

  /**
   * Extensions probed directly (via `stat`) before falling back to a directory scan
   * when resolving a document whose content-type is not known ahead of time.
   * Ordered most-common-first. Any resource stored with an extension not in this list
   * still resolves correctly through the `readdir` fallback in {@link mapUrlToDocumentPath};
   * this list only exists to avoid an O(folder size) scan on the common case, which is
   * pathological for large internal index directories (tens of thousands of entries).
   */
  private static readonly commonExtensions = [
    'json', 'ttl', 'nq', 'nt', 'jsonld', 'trig', 'n3', 'rdf', 'html', 'txt',
  ];

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
      // Fast path: probe the exact file and the common `$.<ext>` variants directly with
      // `stat` (O(1) each). This avoids a full `readdir` of `folder`, which is O(folder size)
      // and becomes a severe bottleneck for large internal index directories where every
      // lookup would otherwise scan tens of thousands of unrelated entries.
      // The fixed candidate order below is safe even though it differs from the (arbitrary)
      // `readdir` iteration order: a resource can only ever have a single stored representation,
      // because `FileDataAccessor.verifyExistingExtension` removes any previously-stored file
      // with a different extension on every write. So at most one candidate can match.
      // Guard against an empty document name (a path ending in `/`): a `stat` of the folder
      // itself would spuriously match. Such paths fall through to the `readdir` fallback below.
      if (documentName) {
        const candidates = [ documentName, ...ExtensionBasedMapper.commonExtensions.map(
          (extension): string => `${documentName}$.${extension}`,
        ) ];
        for (const candidate of candidates) {
          try {
            await fsPromises.stat(joinFilePath(folder, candidate));
            fileName = candidate;
            break;
          } catch {
            // Candidate does not exist; try the next one.
          }
        }
      }
      // Fallback: resource stored with a less common extension (or an unusual name).
      // Scan the folder exactly as before, preserving correctness for pod resources (which may
      // use arbitrary extensions). Skipped for the reserved root-level internal storage
      // (`/.internal/`), whose resources are always JSON and whose index directories can hold
      // tens of thousands of entries — a scan there is unnecessary and pathological, and is the
      // dominant cost of negative index lookups (e.g. a login for a non-existent email). The
      // check anchors on the request path's first segment, so a nested `.internal` container
      // (which could legitimately hold arbitrary extensions) still uses the readdir fallback.
      const isInternalStorage = new URL(identifier.path).pathname.startsWith('/.internal/');
      if (!fileName && !isInternalStorage) {
        try {
          const files = await fsPromises.readdir(folder);
          fileName = files.find((file): boolean =>
            file.startsWith(documentName) && /^(?:\$\..+)?$/u.test(file.slice(documentName.length)));
        } catch {
          // Parent folder does not exist (or is not a folder)
        }
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
