import { Representation } from '../../../../src/ldp/representation/Representation';
import { RepresentationPreferences } from '../../../../src/ldp/representation/RepresentationPreferences';
import { ResourceIdentifier } from '../../../../src/ldp/representation/ResourceIdentifier';
import { checkRequest, matchingTypes } from '../../../../src/storage/conversion/ConversionUtil';

describe('A ConversionUtil', (): void => {
  const identifier: ResourceIdentifier = { path: 'path' };

  describe('#checkRequest', (): void => {
    it('requires an input type.', async(): Promise<void> => {
      const representation = { metadata: {}} as Representation;
      const preferences: RepresentationPreferences = {};
      expect((): any => checkRequest({ identifier, representation, preferences }, [ '*/*' ], [ '*/*' ]))
        .toThrow('Input type required for conversion.');
    });

    it('requires a matching input type.', async(): Promise<void> => {
      const representation = { metadata: { contentType: 'a/x' }} as Representation;
      const preferences: RepresentationPreferences = { type: [{ value: 'b/x', weight: 1 }]};
      expect((): any => checkRequest({ identifier, representation, preferences }, [ 'c/x' ], [ '*/*' ]))
        .toThrow('Can only convert from c/x to */*.');
    });

    it('requires a matching output type.', async(): Promise<void> => {
      const representation = { metadata: { contentType: 'a/x' }} as Representation;
      const preferences: RepresentationPreferences = { type: [{ value: 'b/x', weight: 1 }]};
      expect((): any => checkRequest({ identifier, representation, preferences }, [ '*/*' ], [ 'c/x' ]))
        .toThrow('Can only convert from */* to c/x.');
    });

    it('succeeds with a valid input and output type.', async(): Promise<void> => {
      const representation = { metadata: { contentType: 'a/x' }} as Representation;
      const preferences: RepresentationPreferences = { type: [{ value: 'b/x', weight: 1 }]};
      expect(checkRequest({ identifier, representation, preferences }, [ '*/*' ], [ '*/*' ]))
        .toBeUndefined();
    });
  });

  describe('#matchingTypes', (): void => {
    it('requires type preferences.', async(): Promise<void> => {
      const preferences: RepresentationPreferences = {};
      expect((): any => matchingTypes(preferences, [ '*/*' ]))
        .toThrow('Output type required for conversion.');
    });

    it('returns matching types if weight > 0.', async(): Promise<void> => {
      const preferences: RepresentationPreferences = { type:
          [{ value: 'a/x', weight: 1 }, { value: 'b/x', weight: 0.5 }, { value: 'c/x', weight: 0 }]};
      expect(matchingTypes(preferences, [ 'b/x', 'c/x' ])).toEqual([{ value: 'b/x', weight: 0.5 }]);
    });
  });
});
