import type { ResourceIdentifier } from '../../../../src/ldp/representation/ResourceIdentifier';
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

  it('returns the parent identifier.', async(): Promise<void> => {
    expect(strategy.getParentContainer({ path: 'http://test.com/foo/bar' })).toEqual({ path: 'http://test.com/foo/' });
    expect(strategy.getParentContainer({ path: 'http://test.com/foo/bar/' })).toEqual({ path: 'http://test.com/foo/' });
  });

  it('errors when attempting to get the parent of an unsupported identifier.', async(): Promise<void> => {
    expect((): any => strategy.getParentContainer({ path: '/unsupported' }))
      .toThrow('/unsupported is not supported');
  });

  it('errors when attempting to get the parent of a root container.', async(): Promise<void> => {
    expect((): any => strategy.getParentContainer({ path: 'http://test.com/root' }))
      .toThrow('http://test.com/root is a root container and has no parent');
  });
});
