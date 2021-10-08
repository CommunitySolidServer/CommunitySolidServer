import type { AuxiliaryIdentifierStrategy } from '../../../../src/http/auxiliary/AuxiliaryIdentifierStrategy';
import { RoutingAuxiliaryIdentifierStrategy } from '../../../../src/http/auxiliary/RoutingAuxiliaryIdentifierStrategy';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

class SimpleSuffixStrategy implements AuxiliaryIdentifierStrategy {
  private readonly suffix: string;

  public constructor(suffix: string) {
    this.suffix = suffix;
  }

  public getAuxiliaryIdentifier(identifier: ResourceIdentifier): ResourceIdentifier {
    return { path: `${identifier.path}${this.suffix}` };
  }

  public getAuxiliaryIdentifiers(identifier: ResourceIdentifier): ResourceIdentifier[] {
    return [ this.getAuxiliaryIdentifier(identifier) ];
  }

  public isAuxiliaryIdentifier(identifier: ResourceIdentifier): boolean {
    return identifier.path.endsWith(this.suffix);
  }

  public getSubjectIdentifier(identifier: ResourceIdentifier): ResourceIdentifier {
    return { path: identifier.path.slice(0, -this.suffix.length) };
  }
}

describe('A RoutingAuxiliaryIdentifierStrategy', (): void => {
  let sources: SimpleSuffixStrategy[];
  let strategy: RoutingAuxiliaryIdentifierStrategy;
  const baseId = { path: 'http://test.com/foo' };
  const dummy1Id = { path: 'http://test.com/foo.dummy1' };
  const dummy2Id = { path: 'http://test.com/foo.dummy2' };
  const dummy3Id = { path: 'http://test.com/foo.dummy3' };

  beforeEach(async(): Promise<void> => {
    sources = [
      new SimpleSuffixStrategy('.dummy1'),
      new SimpleSuffixStrategy('.dummy2'),
    ];
    strategy = new RoutingAuxiliaryIdentifierStrategy(sources);
  });

  it('#getAuxiliaryIdentifier always errors.', async(): Promise<void> => {
    expect((): any => strategy.getAuxiliaryIdentifier()).toThrow(InternalServerError);
  });

  it('#getAuxiliaryIdentifiers returns results of all sources.', async(): Promise<void> => {
    expect(strategy.getAuxiliaryIdentifiers(baseId)).toEqual([ dummy1Id, dummy2Id ]);
  });

  it('#isAuxiliaryIdentifier returns true if there is at least 1 match.', async(): Promise<void> => {
    expect(strategy.isAuxiliaryIdentifier(dummy1Id)).toBe(true);
    expect(strategy.isAuxiliaryIdentifier(dummy2Id)).toBe(true);
    expect(strategy.isAuxiliaryIdentifier(dummy3Id)).toBe(false);
  });

  it('#getSubjectIdentifier returns the base id if a match is found.', async(): Promise<void> => {
    expect(strategy.getSubjectIdentifier(dummy1Id)).toEqual(baseId);
    expect(strategy.getSubjectIdentifier(dummy2Id)).toEqual(baseId);
    expect((): any => strategy.getSubjectIdentifier(dummy3Id)).toThrow(NotImplementedHttpError);
  });
});
