import { SingleRootIdentifierStrategy } from '../../../../src/util/identifiers/SingleRootIdentifierStrategy';

describe('A SingleRootIdentifierStrategy', (): void => {
  const baseUrl = 'http://test.com/';
  const manager = new SingleRootIdentifierStrategy(baseUrl);

  it('verifies if identifiers are in its domain.', async(): Promise<void> => {
    expect(manager.supportsIdentifier({ path: 'http://notest.com/' })).toBe(false);
    expect(manager.supportsIdentifier({ path: baseUrl })).toBe(true);
    expect(manager.supportsIdentifier({ path: `${baseUrl}foo/bar` })).toBe(true);
  });

  it('returns the parent identifier.', async(): Promise<void> => {
    expect(manager.getParentContainer({ path: 'http://test.com/foo/bar' })).toEqual({ path: 'http://test.com/foo/' });
    expect(manager.getParentContainer({ path: 'http://test.com/foo/bar/' })).toEqual({ path: 'http://test.com/foo/' });
  });

  it('errors when attempting to get the parent of an unsupported identifier.', async(): Promise<void> => {
    expect((): any => manager.getParentContainer({ path: 'http://nottest.com/' }))
      .toThrow('http://nottest.com/ is not supported');
  });

  it('errors when attempting to get the parent of a root container.', async(): Promise<void> => {
    expect((): any => manager.getParentContainer({ path: 'http://test.com/' }))
      .toThrow('http://test.com/ is a root container and has no parent');
  });

  it('checks for the root container by comparing with the base URL.', async(): Promise<void> => {
    expect(manager.isRootContainer({ path: 'http://notest.com/' })).toBe(false);
    expect(manager.isRootContainer({ path: baseUrl })).toBe(true);
    expect(manager.isRootContainer({ path: `${baseUrl}foo/bar` })).toBe(false);
  });
});
