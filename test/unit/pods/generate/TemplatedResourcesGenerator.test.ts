import { DataFactory } from 'n3';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import { TemplatedResourcesGenerator } from '../../../../src/pods/generate/TemplatedResourcesGenerator';
import type {
  FileIdentifierMapper,
  FileIdentifierMapperFactory,
  ResourceLink,
} from '../../../../src/storage/mapping/FileIdentifierMapper';
import { ensureTrailingSlash, trimTrailingSlashes } from '../../../../src/util/PathUtil';
import { readableToString } from '../../../../src/util/StreamUtil';
import { HandlebarsTemplateEngine } from '../../../../src/util/templates/HandlebarsTemplateEngine';
import { mockFileSystem } from '../../../util/Util';

const { namedNode } = DataFactory;

jest.mock('fs');

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

async function genToArray<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const arr: T[] = [];
  for await (const result of iterable) {
    arr.push(result);
  }
  return arr;
}

describe('A TemplatedResourcesGenerator', (): void => {
  const rootFilePath = '/templates/pod';
  // Using handlebars engine since it's smaller than any possible dummy
  const generator = new TemplatedResourcesGenerator(rootFilePath, new DummyFactory(), new HandlebarsTemplateEngine());
  let cache: { data: any };
  const template = '<{{webId}}> a <http://xmlns.com/foaf/0.1/Person>.';
  const location = { path: 'http://test.com/alice/' };
  const webId = 'http://alice/#profile';

  beforeEach(async(): Promise<void> => {
    cache = mockFileSystem(rootFilePath);
  });

  it('fills in a template with the given options.', async(): Promise<void> => {
    cache.data = { 'template.hbs': template };
    const result = await genToArray(generator.generate(location, { webId }));
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
    const result = await genToArray(generator.generate(location, { webId }));
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
    const result = await genToArray(generator.generate(location, { webId }));
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
    cache.data = { '.meta': meta, container: { 'template.meta': meta, template }};

    // Not using options since our dummy template generator generates invalid turtle
    const result = await genToArray(generator.generate(location, { webId }));
    const identifiers = result.map((res): ResourceIdentifier => res.identifier);
    expect(identifiers).toEqual([
      location,
      { path: `${location.path}container/` },
      { path: `${location.path}container/template` },
    ]);
    // Root has the 1 raw metadata triple (with <> changed to its identifier) and content-type
    const rootMetadata = result[0].representation.metadata;
    expect(rootMetadata.identifier.value).toBe(location.path);
    expect(rootMetadata.quads()).toHaveLength(2);
    expect(rootMetadata.get(namedNode('pre:has'))?.value).toBe('metadata');
    expect(rootMetadata.contentType).toBe('text/turtle');

    // Container has no metadata triples besides content-type
    const contMetadata = result[1].representation.metadata;
    expect(contMetadata.identifier.value).toBe(`${location.path}container/`);
    expect(contMetadata.quads()).toHaveLength(1);
    expect(contMetadata.contentType).toBe('text/turtle');

    // Document has the 1 raw metadata triple (with <> changed to its identifier) and content-type
    const docMetadata = result[2].representation.metadata;
    expect(docMetadata.identifier.value).toBe(`${location.path}container/template`);
    expect(docMetadata.quads()).toHaveLength(2);
    expect(docMetadata.get(namedNode('pre:has'))?.value).toBe('metadata');
    expect(docMetadata.contentType).toBe('text/turtle');
  });
});
