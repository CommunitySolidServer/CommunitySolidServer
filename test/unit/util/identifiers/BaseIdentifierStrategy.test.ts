import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import { extractErrorTerms } from '../../../../src/util/errors/HttpErrorUtil';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import { BaseIdentifierStrategy } from '../../../../src/util/identifiers/BaseIdentifierStrategy';

class DummyStrategy extends BaseIdentifierStrategy {
  public supportsIdentifier(identifier: ResourceIdentifier): boolean {
    return !identifier.path.endsWith('unsupported');
  }

  public isRootContainer(identifier: ResourceIdentifier): boolean {
    return identifier.path.endsWith('root');
  }
}

describe('A BaseIdentifierStrategy', (): void => {
  const strategy = new DummyStrategy();

  describe('getParentContainer', (): void => {
    it('returns the parent identifier.', async(): Promise<void> => {
      expect(strategy.getParentContainer({ path: 'http://example.com/foo/bar' })).toEqual({ path: 'http://example.com/foo/' });
      expect(strategy.getParentContainer({ path: 'http://example.com/foo//' })).toEqual({ path: 'http://example.com/' });
      expect(strategy.getParentContainer({ path: 'http://example.com/foo/bar/' })).toEqual({ path: 'http://example.com/foo/' });
      expect(strategy.getParentContainer({ path: 'http://example.com/foo/bar?q=5' })).toEqual({ path: 'http://example.com/foo/' });
    });

    it('errors when attempting to get the parent of an unsupported identifier.', async(): Promise<void> => {
      let error: unknown;
      try {
        strategy.getParentContainer({ path: '/unsupported' });
      } catch (err: unknown) {
        error = err;
      }
      expect(error).toEqual(expect.objectContaining({
        errorCode: 'E0001',
        message: 'The identifier /unsupported is outside the configured identifier space.',
      }));
      expect(InternalServerError.isInstance(error)).toBe(true);
      expect(extractErrorTerms((error as InternalServerError).metadata)).toEqual({ path: '/unsupported' });
    });

    it('errors when attempting to get the parent of a root container.', async(): Promise<void> => {
      expect((): any => strategy.getParentContainer({ path: 'http://example.com/root' }))
        .toThrow('Cannot obtain the parent of http://example.com/root because it is a root container.');
    });
  });

  describe('contains', (): void => {
    it('returns false if container parameter is not a container identifier.', async(): Promise<void> => {
      expect(strategy.contains({ path: 'http://example.com' }, { path: 'http://example.com/foo' }, false)).toBe(false);
    });

    it('returns false if container parameter is longer.', async(): Promise<void> => {
      expect(strategy.contains({ path: 'http://example.com/foo/' }, { path: 'http://example.com' }, false)).toBe(false);
    });

    it('returns false if container parameter is not the direct container.', async(): Promise<void> => {
      expect(strategy.contains({ path: 'http://example.com/' }, { path: 'http://example.com/foo/bar' }, false)).toBe(false);
    });

    it('returns true if the container parameter is the direct container.', async(): Promise<void> => {
      expect(strategy.contains({ path: 'http://example.com/' }, { path: 'http://example.com/foo/' }, false)).toBe(true);
      expect(strategy.contains({ path: 'http://example.com/' }, { path: 'http://example.com/foo' }, false)).toBe(true);
    });

    it('returns true for transtive calls if container parameter is a grandparent.', async(): Promise<void> => {
      expect(strategy.contains({ path: 'http://example.com/' }, { path: 'http://example.com/foo/bar' }, true)).toBe(true);
    });
  });
});
