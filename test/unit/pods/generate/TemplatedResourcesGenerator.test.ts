import type { ResourceIdentifier } from '../../../../src/ldp/representation/ResourceIdentifier';
import { TemplatedResourcesGenerator } from '../../../../src/pods/generate/TemplatedResourcesGenerator';
import type { TemplateEngine } from '../../../../src/pods/generate/TemplateEngine';
import type {
  FileIdentifierMapper,
  FileIdentifierMapperFactory,
  ResourceLink,
} from '../../../../src/storage/mapping/FileIdentifierMapper';
import { ensureTrailingSlash, trimTrailingSlashes } from '../../../../src/util/PathUtil';
import { readableToString } from '../../../../src/util/StreamUtil';
import { mockFs } from '../../../util/Util';
import Dict = NodeJS.Dict;

jest.mock('fs');

class DummyFactory implements FileIdentifierMapperFactory {
  public async create(base: string, rootFilePath: string): Promise<FileIdentifierMapper> {
    const trimBase = trimTrailingSlashes(base);
    const trimRoot = trimTrailingSlashes(rootFilePath);
    return {
      async mapFilePathToUrl(filePath: string, isContainer: boolean): Promise<ResourceLink> {
        const path = `${trimBase}${filePath.slice(trimRoot.length)}`;
        return {
          identifier: { path: isContainer ? ensureTrailingSlash(path) : path },
          filePath,
          contentType: isContainer ? undefined : 'text/turtle',
        };
      },
    } as any;
  }
}

class DummyEngine implements TemplateEngine {
  public apply(template: string, options: Dict<string>): string {
    const keys = Object.keys(options);
    return `${template}${keys.map((key): string => `{${key}:${options[key]}}`).join('')}`;
  }
}

const genToArray = async<T>(iterable: AsyncIterable<T>): Promise<T[]> => {
  const arr: T[] = [];
  for await (const result of iterable) {
    arr.push(result);
  }
  return arr;
};

describe('A TemplatedResourcesGenerator', (): void => {
  const rootFilePath = 'templates';
  const generator = new TemplatedResourcesGenerator(rootFilePath, new DummyFactory(), new DummyEngine());
  let cache: { data: any };
  const template = '<{{webId}}> a <http://xmlns.com/foaf/0.1/Person>.';
  const location = { path: 'http://test.com/alice/' };
  const webId = 'http://alice/#profile';

  beforeEach(async(): Promise<void> => {
    cache = mockFs(rootFilePath);
  });

  it('fills in a template with the given options.', async(): Promise<void> => {
    cache.data = { template };
    const result = await genToArray(generator.generate(location, { webId }));
    const identifiers = result.map((res): ResourceIdentifier => res.identifier);
    const id = { path: `${location.path}template` };
    expect(identifiers).toEqual([ location, id ]);

    const { representation } = result[1];
    expect(representation.binary).toBe(true);
    expect(representation.metadata.contentType).toBe('text/turtle');
    await expect(readableToString(representation.data)).resolves
      .toEqual(`<{{webId}}> a <http://xmlns.com/foaf/0.1/Person>.{webId:${webId}}`);
  });

  it('creates the necessary containers and ignores non-files.', async(): Promise<void> => {
    cache.data = { container: { container: { template }}, 2: 5 };
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
      .toEqual(`<{{webId}}> a <http://xmlns.com/foaf/0.1/Person>.{webId:${webId}}`);
  });
});
