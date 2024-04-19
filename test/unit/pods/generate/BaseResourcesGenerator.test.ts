import { DataFactory } from 'n3';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import { BaseResourcesGenerator } from '../../../../src/pods/generate/BaseResourcesGenerator';
import type {
  FileIdentifierMapper,
  FileIdentifierMapperFactory,
  ResourceLink,
} from '../../../../src/storage/mapping/FileIdentifierMapper';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { asyncToArray } from '../../../../src/util/IterableUtil';
import { ensureTrailingSlash, joinFilePath, trimTrailingSlashes } from '../../../../src/util/PathUtil';
import { readableToQuads, readableToString } from '../../../../src/util/StreamUtil';
import { HandlebarsTemplateEngine } from '../../../../src/util/templates/HandlebarsTemplateEngine';
import { SimpleSuffixStrategy } from '../../../util/SimpleSuffixStrategy';
import { mockFileSystem } from '../../../util/Util';

jest.mock('node:fs');
jest.mock('fs-extra');

class DummyFactory implements FileIdentifierMapperFactory {
  public async create(base: string, rootFilePath: string): Promise<FileIdentifierMapper> {
    const trimBase = trimTrailingSlashes(base);
    const trimRoot = trimTrailingSlashes(rootFilePath);
    return {
      async mapFilePathToUrl(filePath: string, isContainer: boolean): Promise<ResourceLink> {
        let path = `${trimBase}${filePath.slice(trimRoot.length)}`;
        const isMetadata = filePath.endsWith('.meta');
        if (isMetadata) {
          path = path.slice(0, -'.meta'.length);
        }
        return {
          identifier: { path: isContainer ? ensureTrailingSlash(path) : path },
          filePath,
          contentType: isContainer ? undefined : 'text/turtle',
          isMetadata,
        };
      },
    } as any;
  }
}

describe('A BaseResourcesGenerator', (): void => {
  const rootFilePath = '/templates/pod';
  // Using handlebars engine since it's smaller than any possible dummy
  const metadataStrategy = new SimpleSuffixStrategy('.meta');
  let store: jest.Mocked<ResourceStore>;
  let generator: BaseResourcesGenerator;
  let cache: { data: any };
  const template = '<{{webId}}> a <http://xmlns.com/foaf/0.1/Person>.';
  const location = { path: 'http://test.com/alice/' };
  const webId = 'http://alice/#profile';

  beforeEach(async(): Promise<void> => {
    cache = mockFileSystem(rootFilePath);
    store = {
      hasResource: jest.fn(),
    } as any;

    generator = new BaseResourcesGenerator({
      factory: new DummyFactory(),
      templateEngine: new HandlebarsTemplateEngine('http://test.com/'),
      metadataStrategy,
      store,
    });
  });

  it('fills in a template with the given options.', async(): Promise<void> => {
    cache.data = { 'template.hbs': template };
    const result = await asyncToArray(generator.generate(rootFilePath, location, { webId }));
    const identifiers = result.map((res): ResourceIdentifier => res.identifier);
    const id = { path: `${location.path}template` };
    expect(identifiers).toEqual([ location, id ]);

    const { representation } = result[1];
    expect(representation.binary).toBe(true);
    expect(representation.metadata.contentType).toBe('text/turtle');
    await expect(readableToString(representation.data)).resolves
      .toBe(`<${webId}> a <http://xmlns.com/foaf/0.1/Person>.`);
  });

  it('creates the necessary containers.', async(): Promise<void> => {
    cache.data = { container: { container: { 'template.hbs': template }}};
    const result = await asyncToArray(generator.generate(rootFilePath, location, { webId }));
    const identifiers = result.map((res): ResourceIdentifier => res.identifier);
    const id = { path: `${location.path}container/container/template` };
    expect(identifiers).toEqual([
      location,
      { path: `${location.path}container/` },
      { path: `${location.path}container/container/` },
      id,
    ]);

    const { representation } = result[3];
    await expect(readableToString(representation.data)).resolves
      .toBe(`<${webId}> a <http://xmlns.com/foaf/0.1/Person>.`);
  });

  it('copies the file stream directly if no template extension is found.', async(): Promise<void> => {
    cache.data = { noTemplate: template };
    const result = await asyncToArray(generator.generate(rootFilePath, location, { webId }));
    const identifiers = result.map((res): ResourceIdentifier => res.identifier);
    const id = { path: `${location.path}noTemplate` };
    expect(identifiers).toEqual([ location, id ]);

    const { representation } = result[1];
    expect(representation.binary).toBe(true);
    expect(representation.metadata.contentType).toBe('text/turtle');
    await expect(readableToString(representation.data)).resolves.toEqual(template);
  });

  it('adds metadata from .meta files.', async(): Promise<void> => {
    const meta = '<> <pre:has> "metadata".';
    const metaType = '<> <http://www.w3.org/ns/ma-ont#format> "text/plain".';
    cache.data = { '.meta': meta, container: { 'template.meta': meta, template, type: 'dummy', 'type.meta': metaType }};

    // Not using options since our dummy template generator generates invalid turtle
    const result = await asyncToArray(generator.generate(rootFilePath, location, { webId }));
    const identifiers = result.map((res): ResourceIdentifier => res.identifier);
    expect(identifiers).toEqual([
      location,
      { path: `${location.path}.meta` },
      { path: `${location.path}container/` },
      { path: `${location.path}container/template` },
      { path: `${location.path}container/type` },
    ]);

    // Root has the 1 raw metadata triple (with <> changed to its identifier) and content-type
    const rootMetadata = result[0].representation.metadata;
    expect(rootMetadata.identifier.value).toBe(location.path);
    expect(rootMetadata.contentType).toBeUndefined();
    const rootMetadataQuads = await readableToQuads(result[1].representation.data);
    const expRootMetadataQuads = rootMetadataQuads.getQuads(rootMetadata.identifier, 'pre:has', null, null);
    expect(expRootMetadataQuads).toHaveLength(1);
    expect(expRootMetadataQuads[0].object.value).toBe('metadata');

    // Container has no metadata triples besides content-type
    const contMetadata = result[2].representation.metadata;
    expect(contMetadata.identifier.value).toBe(`${location.path}container/`);
    expect(contMetadata.quads()).toHaveLength(0);

    // Document has the new metadata
    const docMetadata = result[3].representation.metadata;
    expect(docMetadata.identifier.value).toBe(`${location.path}container/template`);
    // Metadata will replace existing metadata so need to make sure content-type is still there
    expect(docMetadata.contentType).toBe('text/turtle');
    expect(docMetadata.get(DataFactory.namedNode('pre:has'))?.value).toBe('metadata');

    // Type document has new content type
    const typeMetadata = result[4].representation.metadata;
    expect(typeMetadata.identifier.value).toBe(`${location.path}container/type`);
    expect(typeMetadata.contentType).toBe('text/plain');
  });

  it('does not create container when it already exists.', async(): Promise<void> => {
    const meta = '<> <pre:has> "metadata".';
    cache.data = { '.meta': meta };
    jest.spyOn(store, 'hasResource').mockResolvedValue(true);

    const result = await asyncToArray(generator.generate(rootFilePath, location, { webId }));
    const identifiers = result.map((res): ResourceIdentifier => res.identifier);
    expect(identifiers).toEqual([
      { path: `${location.path}.meta` },
    ]);

    const quads = await readableToQuads(result[0].representation.data);
    const expQuads = quads.getQuads(`${location.path}`, 'pre:has', null, null);
    expect(expQuads).toHaveLength(1);
    expect(expQuads[0].object.value).toBe('metadata');
  });

  it('returns no results if the target folder does not exist.', async(): Promise<void> => {
    const result = await asyncToArray(generator.generate(joinFilePath(rootFilePath, 'nope'), location, { webId }));
    expect(result).toHaveLength(0);
  });

  it('makes sure the results are sorted.', async(): Promise<void> => {
    cache.data = { 'template2.hbs': template, 'template1.hbs': template };
    const result = await asyncToArray(generator.generate(rootFilePath, location, { webId }));
    const identifiers = result.map((res): ResourceIdentifier => res.identifier);
    expect(identifiers).toEqual([
      location,
      { path: `${location.path}template1` },
      { path: `${location.path}template2` },
    ]);
  });
});
