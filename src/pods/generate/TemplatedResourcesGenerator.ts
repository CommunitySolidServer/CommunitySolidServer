import { createReadStream, promises as fsPromises } from 'fs';
import type { Readable } from 'stream';
import { Parser } from 'n3';
import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type {
  FileIdentifierMapper,
  FileIdentifierMapperFactory,
  ResourceLink,
} from '../../storage/mapping/FileIdentifierMapper';
import { TEXT_TURTLE } from '../../util/ContentTypes';
import { guardStream } from '../../util/GuardedStream';
import type { Guarded } from '../../util/GuardedStream';
import { joinFilePath, isContainerIdentifier, resolveAssetPath } from '../../util/PathUtil';
import { guardedStreamFrom, readableToString } from '../../util/StreamUtil';
import type { TemplateEngine } from '../../util/templates/TemplateEngine';
import type { Resource, ResourcesGenerator } from './ResourcesGenerator';
import Dict = NodeJS.Dict;

interface TemplateResourceLink extends ResourceLink {
  isTemplate: boolean;
}

/**
 * Generates resources by making use of a template engine.
 * The template folder structure will be kept.
 * Folders will be interpreted as containers and files as documents.
 * A FileIdentifierMapper will be used to generate identifiers that correspond to the relative structure.
 *
 * A relative `templateFolder` is resolved relative to cwd,
 * unless it's preceded by `@css:`, e.g. `@css:foo/bar`.
 */
export class TemplatedResourcesGenerator implements ResourcesGenerator {
  private readonly templateFolder: string;
  private readonly factory: FileIdentifierMapperFactory;
  private readonly templateEngine: TemplateEngine;
  private readonly templateExtension: string;

  /**
   * A mapper is needed to convert the template file paths to identifiers relative to the given base identifier.
   *
   * @param templateFolder - Folder where the templates are located.
   * @param factory - Factory used to generate mapper relative to the base identifier.
   * @param templateEngine - Template engine for generating the resources.
   * @param templateExtension - The extension of files that need to be interpreted as templates.
   *                            Will be removed to generate the identifier.
   */
  public constructor(templateFolder: string, factory: FileIdentifierMapperFactory, templateEngine: TemplateEngine,
    templateExtension = '.hbs') {
    this.templateFolder = resolveAssetPath(templateFolder);
    this.factory = factory;
    this.templateEngine = templateEngine;
    this.templateExtension = templateExtension;
  }

  public async* generate(location: ResourceIdentifier, options: Dict<string>): AsyncIterable<Resource> {
    const mapper = await this.factory.create(location.path, this.templateFolder);
    const folderLink = await this.toTemplateLink(this.templateFolder, mapper);
    yield* this.processFolder(folderLink, mapper, options);
  }

  /**
   * Generates results for all entries in the given folder, including the folder itself.
   */
  private async* processFolder(folderLink: TemplateResourceLink, mapper: FileIdentifierMapper, options: Dict<string>):
  AsyncIterable<Resource> {
    // Group resource links with their corresponding metadata links
    const links = await this.groupLinks(folderLink.filePath, mapper);

    // Remove root metadata if it exists
    const metaLink = links[folderLink.identifier.path]?.meta;
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete links[folderLink.identifier.path];

    yield this.generateResource(folderLink, options, metaLink);

    for (const { link, meta } of Object.values(links)) {
      if (isContainerIdentifier(link.identifier)) {
        yield* this.processFolder(link, mapper, options);
      } else {
        yield this.generateResource(link, options, meta);
      }
    }
  }

  /**
   * Creates a TemplateResourceLink for the given filePath.
   * The identifier will be based on the file path stripped from the template extension,
   * but the filePath parameter will still point to the original file.
   */
  private async toTemplateLink(filePath: string, mapper: FileIdentifierMapper): Promise<TemplateResourceLink> {
    const stats = await fsPromises.lstat(filePath);

    // Slice the template extension from the filepath for correct identifier generation
    const isTemplate = filePath.endsWith(this.templateExtension);
    const slicedPath = isTemplate ? filePath.slice(0, -this.templateExtension.length) : filePath;
    const link = await mapper.mapFilePathToUrl(slicedPath, stats.isDirectory());
    // We still need the original file path for disk reading though
    return {
      ...link,
      filePath,
      isTemplate,
    };
  }

  /**
   * Generates TemplateResourceLinks for each entry in the given folder
   * and combines the results so resources and their metadata are grouped together.
   */
  private async groupLinks(folderPath: string, mapper: FileIdentifierMapper):
  Promise<Record<string, { link: TemplateResourceLink; meta?: TemplateResourceLink }>> {
    const files = await fsPromises.readdir(folderPath);
    const links: Record<string, { link: TemplateResourceLink; meta?: TemplateResourceLink }> = { };
    for (const name of files) {
      const link = await this.toTemplateLink(joinFilePath(folderPath, name), mapper);
      const { path } = link.identifier;
      links[path] = Object.assign(links[path] || {}, link.isMetadata ? { meta: link } : { link });
    }
    return links;
  }

  /**
   * Generates a Resource object for the given ResourceLink.
   * In the case of documents the corresponding template will be used.
   * If a ResourceLink of metadata is provided the corresponding data will be added as metadata.
   */
  private async generateResource(link: TemplateResourceLink, options: Dict<string>, metaLink?: TemplateResourceLink):
  Promise<Resource> {
    let data: Guarded<Readable> | undefined;
    const metadata = new RepresentationMetadata(link.identifier);

    // Read file if it is not a container
    if (isContainerIdentifier(link.identifier)) {
      // Containers need to be an RDF type
      metadata.contentType = TEXT_TURTLE;
    } else {
      data = await this.processFile(link, options);
      metadata.contentType = link.contentType;
    }

    // Add metadata from meta file if there is one
    if (metaLink) {
      const rawMetadata = await this.generateMetadata(metaLink, options);
      metadata.addQuads(rawMetadata.quads());
    }

    return {
      identifier: link.identifier,
      representation: new BasicRepresentation(data ?? [], metadata),
    };
  }

  /**
   * Generates a RepresentationMetadata using the given template.
   */
  private async generateMetadata(metaLink: TemplateResourceLink, options: Dict<string>):
  Promise<RepresentationMetadata> {
    const metadata = new RepresentationMetadata(metaLink.identifier);

    const data = await this.processFile(metaLink, options);
    const parser = new Parser({ format: metaLink.contentType, baseIRI: metaLink.identifier.path });
    const quads = parser.parse(await readableToString(data));
    metadata.addQuads(quads);

    return metadata;
  }

  /**
   * Creates a read stream from the file and applies the template if necessary.
   */
  private async processFile(link: TemplateResourceLink, options: Dict<string>): Promise<Guarded<Readable>> {
    if (link.isTemplate) {
      const rendered = await this.templateEngine.render(options, { templateFile: link.filePath });
      return guardedStreamFrom(rendered);
    }
    return guardStream(createReadStream(link.filePath));
  }
}
