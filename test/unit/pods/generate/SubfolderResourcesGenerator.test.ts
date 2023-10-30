import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Resource } from '../../../../src/pods/generate/ResourcesGenerator';
import { SubfolderResourcesGenerator } from '../../../../src/pods/generate/SubfolderResourcesGenerator';
import type { TemplatedResourcesGenerator } from '../../../../src/pods/generate/TemplatedResourcesGenerator';
import { asyncToArray } from '../../../../src/util/IterableUtil';

async function* yieldResources(resources: Resource[]): AsyncIterable<Resource> {
  yield* resources;
}

function createResource(path: string): Resource {
  const identifier = { path };
  const representation = new BasicRepresentation('data', 'text/plain');
  return { identifier, representation };
}

describe('A SubfolderResourcesGenerator', (): void => {
  const templateFolder = '/data/templates/';
  const identifier = { path: 'http://example.com/foo' };
  const options = { foo: 'bar' };
  const subfolders = [ 'base', 'empty', 'extra' ];
  let baseResources: Resource[];
  let extraResources: Resource[];
  let source: jest.Mocked<TemplatedResourcesGenerator>;
  let generator: SubfolderResourcesGenerator;

  beforeEach(async(): Promise<void> => {
    baseResources = [];
    extraResources = [];

    source = {
      // eslint-disable-next-line unused-imports/no-unused-vars
      generate: jest.fn((folder, loc, opt): AsyncIterable<Resource> => {
        if (folder.endsWith('base')) {
          return yieldResources(baseResources);
        }
        if (folder.endsWith('extra')) {
          return yieldResources(extraResources);
        }
        return yieldResources([]);
      }),
    };

    generator = new SubfolderResourcesGenerator(source, subfolders);
  });

  it('merges the results of the subfolders into one sorted result.', async(): Promise<void> => {
    baseResources = [ createResource('a'), createResource('c'), createResource('d'), createResource('f') ];
    extraResources = [ createResource('b'), createResource('e'), createResource('g') ];

    const resources = await asyncToArray(generator.generate(templateFolder, identifier, options));
    expect(resources.map((resource): string => resource.identifier.path)).toEqual(
      [ 'a', 'b', 'c', 'd', 'e', 'f', 'g' ],
    );
    expect(source.generate).toHaveBeenCalledTimes(3);
    expect(source.generate).toHaveBeenNthCalledWith(1, '/data/templates/base', identifier, options);
    expect(source.generate).toHaveBeenNthCalledWith(2, '/data/templates/empty', identifier, options);
    expect(source.generate).toHaveBeenNthCalledWith(3, '/data/templates/extra', identifier, options);
  });

  it('keeps the first result in case of duplicate identifiers.', async(): Promise<void> => {
    const resource1 = createResource('foo');
    const resource2 = createResource('foo');
    baseResources = [ createResource('b'), resource1, createResource('g') ];
    extraResources = [ createResource('a'), resource2, createResource('h') ];
    const resources = await asyncToArray(generator.generate(templateFolder, identifier, options));
    expect(resources.map((resource): string => resource.identifier.path)).toEqual(
      [ 'a', 'b', 'foo', 'g', 'h' ],
    );
    expect(resources[2]).toBe(resource1);
    expect(resource2.representation.data.destroyed).toBe(true);
  });

  it('correctly sorts containers.', async(): Promise<void> => {
    baseResources = [
      createResource('/'),
      createResource('/container/'),
      createResource('/container/foo.acl'),
      createResource('README.acl'),
    ];
    extraResources = [
      createResource('/'),
      createResource('/container/'),
      createResource('/container/foo'),
      createResource('README'),
    ];

    const resources = await asyncToArray(generator.generate(templateFolder, identifier, options));
    expect(resources.map((resource): string => resource.identifier.path)).toEqual([
      '/',
      '/container/',
      '/container/foo',
      '/container/foo.acl',
      'README',
      'README.acl',
    ]);
  });
});
