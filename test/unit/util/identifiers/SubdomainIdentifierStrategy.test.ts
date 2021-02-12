import { SubdomainIdentifierStrategy } from '../../../../src/util/identifiers/SubdomainIdentifierStrategy';

describe('A SubdomainIdentifierStrategy', (): void => {
  const baseUrl = 'http://test.com/foo/';
  const strategy = new SubdomainIdentifierStrategy(baseUrl);

  it('supports URLs in its domain.', async(): Promise<void> => {
    expect(strategy.supportsIdentifier({ path: 'http://test.com/foo/' })).toBe(true);
    expect(strategy.supportsIdentifier({ path: 'http://alice.test.com/foo/' })).toBe(true);
    expect(strategy.supportsIdentifier({ path: 'http://a.b.c.test.com/foo/' })).toBe(true);

    expect(strategy.supportsIdentifier({ path: 'http://test.com/foo/bar' })).toBe(true);
    expect(strategy.supportsIdentifier({ path: 'http://alice.test.com/foo/bar' })).toBe(true);
    expect(strategy.supportsIdentifier({ path: 'http://a.b.c.test.com/foo/bar' })).toBe(true);
  });

  it('does not support URLs outside of its domain.', async(): Promise<void> => {
    expect(strategy.supportsIdentifier({ path: 'http://fake.com/http://test.com/foo/' })).toBe(false);
    expect(strategy.supportsIdentifier({ path: 'http://fake.com/test.com/foo/' })).toBe(false);
    expect(strategy.supportsIdentifier({ path: 'http://faketest.com/foo/' })).toBe(false);
    expect(strategy.supportsIdentifier({ path: 'http://test.com/foo' })).toBe(false);
    expect(strategy.supportsIdentifier({ path: 'ftp://test.com/foo/' })).toBe(false);
  });

  it('identifiers the base and all subdomains as root containers.', async(): Promise<void> => {
    expect(strategy.isRootContainer({ path: 'http://test.com/foo/' })).toBe(true);
    expect(strategy.isRootContainer({ path: 'http://alice.test.com/foo/' })).toBe(true);

    expect(strategy.isRootContainer({ path: 'http://test.com/foo/bar' })).toBe(false);
    expect(strategy.isRootContainer({ path: 'http://alice.test.com/foo/bar' })).toBe(false);
  });
});
