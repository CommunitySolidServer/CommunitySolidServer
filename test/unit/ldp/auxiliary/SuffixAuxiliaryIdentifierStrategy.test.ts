import { SuffixAuxiliaryIdentifierStrategy } from '../../../../src/ldp/auxiliary/SuffixAuxiliaryIdentifierStrategy';
import type { ResourceIdentifier } from '../../../../src/ldp/representation/ResourceIdentifier';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import 'jest-rdf';

const suffix = '.dummy';

describe('A SuffixAuxiliaryManager', (): void => {
  let strategy: SuffixAuxiliaryIdentifierStrategy;
  const associatedId: ResourceIdentifier = { path: 'http://test.com/foo' };
  const auxiliaryId: ResourceIdentifier = { path: 'http://test.com/foo.dummy' };

  beforeEach(async(): Promise<void> => {
    strategy = new SuffixAuxiliaryIdentifierStrategy(suffix);
  });

  it('errors if the suffix is empty.', async(): Promise<void> => {
    expect((): any => new SuffixAuxiliaryIdentifierStrategy('')).toThrow('Suffix length should be non-zero.');
  });

  it('creates new identifiers by appending the suffix.', async(): Promise<void> => {
    expect(strategy.getAuxiliaryIdentifier(associatedId)).toEqual(auxiliaryId);
  });

  it('returns the same single identifier when requesting all of them.', async(): Promise<void> => {
    expect(strategy.getAuxiliaryIdentifiers(associatedId)).toEqual([ auxiliaryId ]);
  });

  it('checks the suffix to determine if an identifier is auxiliary.', async(): Promise<void> => {
    expect(strategy.isAuxiliaryIdentifier(associatedId)).toBe(false);
    expect(strategy.isAuxiliaryIdentifier(auxiliaryId)).toBe(true);
  });

  it('errors when trying to get the associated id from a non-auxiliary identifier.', async(): Promise<void> => {
    expect((): any => strategy.getAssociatedIdentifier(associatedId)).toThrow(InternalServerError);
  });

  it('removes the suffix to create the associated identifier.', async(): Promise<void> => {
    expect(strategy.getAssociatedIdentifier(auxiliaryId)).toEqual(associatedId);
  });

  it('returns true on canDeleteRoot.', async(): Promise<void> => {
    expect(strategy.canDeleteRoot()).toEqual(true);
  });
});
