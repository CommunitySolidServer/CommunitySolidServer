import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import type { Resource } from '../../../../src/pods/generate/ResourcesGenerator';
import { StaticFolderGenerator } from '../../../../src/pods/generate/StaticFolderGenerator';
import type { TemplatedResourcesGenerator } from '../../../../src/pods/generate/TemplatedResourcesGenerator';

describe('A StaticFolderGenerator', (): void => {
  const location: ResourceIdentifier = { path: 'http://example.com/foo' };
  const options = { foo: 'bar' };
  const folder = '/data/templates/';
  let source: jest.Mocked<TemplatedResourcesGenerator>;
  const response: AsyncIterable<Resource> = {} as any;
  let generator: StaticFolderGenerator;

  beforeEach(async(): Promise<void> => {
    source = {
      generate: jest.fn().mockReturnValue(response),
    };
    generator = new StaticFolderGenerator(source, folder);
  });

  it('calls the source generator with the stored template folder.', async(): Promise<void> => {
    expect(generator.generate(location, options)).toBe(response);
    expect(source.generate).toHaveBeenCalledTimes(1);
    expect(source.generate).toHaveBeenLastCalledWith(folder, location, options);
  });
});
