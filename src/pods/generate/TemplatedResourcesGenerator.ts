import { promises as fsPromises } from 'fs';
import { posix } from 'path';
import { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import type { FileIdentifierMapper, FileIdentifierMapperFactory } from '../../storage/mapping/FileIdentifierMapper';
import { guardedStreamFrom } from '../../util/StreamUtil';
import type { Resource, ResourcesGenerator } from './ResourcesGenerator';
import type { TemplateEngine } from './TemplateEngine';
import Dict = NodeJS.Dict;

const { join: joinPath } = posix;

/**
 * Generates resources by making use of a template engine.
 * The template folder structure will be kept.
 * Folders will be interpreted as containers and files as documents.
 * A FileIdentifierMapper will be used to generate identifiers that correspond to the relative structure.
 */
export class TemplatedResourcesGenerator implements ResourcesGenerator {
  private readonly templateFolder: string;
  private readonly factory: FileIdentifierMapperFactory;
  private readonly engine: TemplateEngine;

  /**
   * A mapper is needed to convert the template file paths to identifiers relative to the given base identifier.
   *
   * @param templateFolder - Folder where the templates are located.
   * @param factory - Factory used to generate mapper relative to the base identifier.
   * @param engine - Template engine for generating the resources.
   */
  public constructor(templateFolder: string, factory: FileIdentifierMapperFactory, engine: TemplateEngine) {
    this.templateFolder = templateFolder;
    this.factory = factory;
    this.engine = engine;
  }

  public async* generate(location: ResourceIdentifier, options: Dict<string>): AsyncIterable<Resource> {
    const mapper = await this.factory.create(location.path, this.templateFolder);
    yield* this.parseFolder(this.templateFolder, mapper, options);
  }

  /**
   * Generates results for all entries in the given folder, including the folder itself.
   */
  private async* parseFolder(filePath: string, mapper: FileIdentifierMapper, options: Dict<string>):
  AsyncIterable<Resource> {
    // Generate representation for the container
    const link = await mapper.mapFilePathToUrl(filePath, true);
    yield {
      identifier: link.identifier,
      representation: {
        binary: true,
        data: guardedStreamFrom([]),
        metadata: new RepresentationMetadata(link.identifier.path),
      },
    };

    // Generate representations for all resources in this container
    const files = await fsPromises.readdir(filePath);
    for (const childName of files) {
      const childPath = joinPath(filePath, childName);
      const childStats = await fsPromises.lstat(childPath);
      if (childStats.isDirectory()) {
        yield* this.parseFolder(childPath, mapper, options);
      } else if (childStats.isFile()) {
        yield this.generateDocument(childPath, mapper, options);
      }
    }
  }

  /**
   * Generates a new Representation corresponding to the template file at the given location.
   */
  private async generateDocument(filePath: string, mapper: FileIdentifierMapper, options: Dict<string>):
  Promise<Resource> {
    const link = await mapper.mapFilePathToUrl(filePath, false);
    const metadata = new RepresentationMetadata(link.identifier.path);
    metadata.contentType = link.contentType;

    const raw = await fsPromises.readFile(filePath, 'utf8');
    const compiled = this.engine.apply(raw, options);

    return {
      identifier: link.identifier,
      representation: {
        binary: true,
        data: guardedStreamFrom([ compiled ]),
        metadata,
      },
    };
  }
}
