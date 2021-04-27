import { promises as fsPromises } from 'fs';
import { Parser } from 'n3';
import { BasicRepresentation } from '../../ldp/representation/BasicRepresentation';
import { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import type {
  FileIdentifierMapper,
  FileIdentifierMapperFactory,
  ResourceLink,
} from '../../storage/mapping/FileIdentifierMapper';
import { joinFilePath, isContainerIdentifier, resolveAssetPath } from '../../util/PathUtil';
import type { Resource, ResourcesGenerator } from './ResourcesGenerator';
import type { TemplateEngine } from './TemplateEngine';
import Dict = NodeJS.Dict;

/**
 * Generates resources by making use of a template engine.
 * The template folder structure will be kept.
 * Folders will be interpreted as containers and files as documents.
 * A FileIdentifierMapper will be used to generate identifiers that correspond to the relative structure.
 *
 * A relative `templateFolder` is resolved relative to cwd,
 * unless it's preceded by $PACKAGE_ROOT/, e.g. $PACKAGE_ROOT/foo/bar.
 */
export class TemplatedResourcesGenerator implements ResourcesGenerator {
  private readonly templateFolder: string;
  private readonly factory: FileIdentifierMapperFactory;
  private readonly engine: TemplateEngine;
  private readonly metaExtension = '.meta';

  /**
   * A mapper is needed to convert the template file paths to identifiers relative to the given base identifier.
   *
   * @param templateFolder - Folder where the templates are located.
   * @param factory - Factory used to generate mapper relative to the base identifier.
   * @param engine - Template engine for generating the resources.
   */
  public constructor(templateFolder: string, factory: FileIdentifierMapperFactory, engine: TemplateEngine) {
    this.templateFolder = resolveAssetPath(templateFolder);
    this.factory = factory;
    this.engine = engine;
  }

  public async* generate(location: ResourceIdentifier, options: Dict<string>): AsyncIterable<Resource> {
    const mapper = await this.factory.create(location.path, this.templateFolder);
    const folderLink = await mapper.mapFilePathToUrl(this.templateFolder, true);
    yield* this.parseFolder(folderLink, mapper, options);
  }

  /**
   * Generates results for all entries in the given folder, including the folder itself.
   */
  private async* parseFolder(folderLink: ResourceLink, mapper: FileIdentifierMapper, options: Dict<string>):
  AsyncIterable<Resource> {
    // Group resource links with their corresponding metadata links
    const links = await this.groupLinks(this.generateLinks(folderLink.filePath, mapper));

    // Remove root metadata if it exists
    const metaLink = links[folderLink.identifier.path]?.meta;
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete links[folderLink.identifier.path];

    yield this.generateResource(folderLink, options, metaLink);

    for (const { link, meta } of Object.values(links)) {
      if (isContainerIdentifier(link.identifier)) {
        yield* this.parseFolder(link, mapper, options);
      } else {
        yield this.generateResource(link, options, meta);
      }
    }
  }

  /**
   * Generates ResourceLinks for each entry in the given folder.
   */
  private async* generateLinks(folderPath: string, mapper: FileIdentifierMapper): AsyncIterable<ResourceLink> {
    const files = await fsPromises.readdir(folderPath);
    for (const name of files) {
      const filePath = joinFilePath(folderPath, name);
      const stats = await fsPromises.lstat(filePath);
      yield mapper.mapFilePathToUrl(filePath, stats.isDirectory());
    }
  }

  /**
   * Parses a group of ResourceLinks so resources and their metadata are grouped together.
   */
  private async groupLinks(linkGen: AsyncIterable<ResourceLink>):
  Promise<Record<string, { link: ResourceLink; meta?: ResourceLink }>> {
    const links: Record<string, { link: ResourceLink; meta?: ResourceLink }> = { };
    for await (const link of linkGen) {
      const { path } = link.identifier;
      if (this.isMeta(path)) {
        const resourcePath = this.metaToResource(link.identifier).path;
        links[resourcePath] = Object.assign(links[resourcePath] || {}, { meta: link });
      } else {
        links[path] = Object.assign(links[path] || {}, { link });
      }
    }
    return links;
  }

  /**
   * Generates a Resource object for the given ResourceLink.
   * In the case of documents the corresponding template will be used.
   * If a ResourceLink of metadata is provided the corresponding data will be added as metadata.
   */
  private async generateResource(link: ResourceLink, options: Dict<string>, metaLink?: ResourceLink):
  Promise<Resource> {
    const data: string[] = [];
    const metadata = new RepresentationMetadata(link.identifier);

    // Read file if it is not a container
    if (!isContainerIdentifier(link.identifier)) {
      const compiled = await this.parseTemplate(link.filePath, options);
      data.push(compiled);
      metadata.contentType = link.contentType;
    }

    // Add metadata from meta file if there is one
    if (metaLink) {
      const rawMetadata = await this.generateMetadata(metaLink, options);
      metadata.addQuads(rawMetadata.quads());
    }

    return {
      identifier: link.identifier,
      representation: new BasicRepresentation(data, metadata),
    };
  }

  /**
   * Generates a RepresentationMetadata using the given template.
   */
  private async generateMetadata(metaLink: ResourceLink, options: Dict<string>):
  Promise<RepresentationMetadata> {
    const identifier = this.metaToResource(metaLink.identifier);
    const metadata = new RepresentationMetadata(identifier);

    const data = await this.parseTemplate(metaLink.filePath, options);
    const parser = new Parser({ format: metaLink.contentType, baseIRI: identifier.path });
    const quads = parser.parse(data);
    metadata.addQuads(quads);

    return metadata;
  }

  /**
   * Applies the given options to the template found at the given path.
   */
  private async parseTemplate(filePath: string, options: Dict<string>): Promise<string> {
    const raw = await fsPromises.readFile(filePath, 'utf8');
    return this.engine.apply(raw, options);
  }

  /**
   * Verifies if the given path corresponds to a metadata file.
   */
  private isMeta(path: string): boolean {
    return path.endsWith(this.metaExtension);
  }

  /**
   * Converts a generated metadata identifier to the identifier of its corresponding resource.
   */
  private metaToResource(metaIdentifier: ResourceIdentifier): ResourceIdentifier {
    return { path: metaIdentifier.path.slice(0, -this.metaExtension.length) };
  }
}
