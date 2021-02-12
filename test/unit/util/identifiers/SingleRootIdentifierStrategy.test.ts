import { SingleRootIdentifierStrategy } from '../../../../src/util/identifiers/SingleRootIdentifierStrategy';

describe('A SingleRootIdentifierStrategy', (): void => {
  const baseUrl = 'http://test.com/';
  const strategy = new SingleRootIdentifierStrategy(baseUrl);

  it('verifies if identifiers are in its domain.', async(): Promise<void> => {
    expect(strategy.supportsIdentifier({ path: 'http://notest.com/' })).toBe(false);
    expect(strategy.supportsIdentifier({ path: baseUrl })).toBe(true);
    expect(strategy.supportsIdentifier({ path: `${baseUrl}foo/bar` })).toBe(true);
  });

  it('checks for the root container by comparing with the base URL.', async(): Promise<void> => {
    expect(strategy.isRootContainer({ path: 'http://notest.com/' })).toBe(false);
    expect(strategy.isRootContainer({ path: baseUrl })).toBe(true);
    expect(strategy.isRootContainer({ path: `${baseUrl}foo/bar` })).toBe(false);
  });
});
