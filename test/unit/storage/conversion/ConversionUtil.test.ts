import type { Representation } from '../../../../src/ldp/representation/Representation';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';
import type { RepresentationPreferences } from '../../../../src/ldp/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../../../../src/ldp/representation/ResourceIdentifier';
import {
  matchesMediaType,
  matchingMediaTypes,
  supportsConversion,
} from '../../../../src/storage/conversion/ConversionUtil';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';

describe('ConversionUtil', (): void => {
  const identifier: ResourceIdentifier = { path: 'path' };
  let representation: Representation;
  let metadata: RepresentationMetadata;

  beforeEach(async(): Promise<void> => {
    metadata = new RepresentationMetadata();
    representation = { metadata } as Representation;
  });

  describe('#supportsConversion', (): void => {
    it('requires an input type.', async(): Promise<void> => {
      const preferences: RepresentationPreferences = {};
      expect((): any => supportsConversion({ identifier, representation, preferences }, [ 'a/x' ], [ 'a/x' ]))
        .toThrow('Input type required for conversion.');
    });

    it('requires a matching input type.', async(): Promise<void> => {
      metadata.contentType = 'a/x';
      const preferences: RepresentationPreferences = { type: [{ value: 'b/x', weight: 1 }]};
      expect((): any => supportsConversion({ identifier, representation, preferences }, [ 'c/x' ], [ 'a/x' ]))
        .toThrow('Can only convert from c/x to a/x.');
    });

    it('requires a matching output type.', async(): Promise<void> => {
      metadata.contentType = 'a/x';
      const preferences: RepresentationPreferences = { type: [{ value: 'b/x', weight: 1 }]};
      expect((): any => supportsConversion({ identifier, representation, preferences }, [ 'a/x' ], [ 'c/x' ]))
        .toThrow('Can only convert from a/x to c/x.');
    });

    it('succeeds with a valid input and output type.', async(): Promise<void> => {
      metadata.contentType = 'a/x';
      const preferences: RepresentationPreferences = { type: [{ value: 'b/x', weight: 1 }]};
      expect(supportsConversion({ identifier, representation, preferences }, [ 'a/x' ], [ 'b/x' ]))
        .toBeUndefined();
    });
  });

  describe('#matchingMediaTypes', (): void => {
    it('requires type preferences.', async(): Promise<void> => {
      const preferences: RepresentationPreferences = {};
      expect((): any => matchingMediaTypes(preferences, [ 'a/b' ]))
        .toThrow('Output type required for conversion.');
    });

    it('returns matching types if weight > 0.', async(): Promise<void> => {
      const preferences: RepresentationPreferences = { type:
          [{ value: 'a/x', weight: 1 }, { value: 'b/x', weight: 0.5 }, { value: 'c/x', weight: 0 }]};
      expect(matchingMediaTypes(preferences, [ 'b/x', 'c/x' ])).toEqual([{ value: 'b/x', weight: 0.5 }]);
    });

    it('errors if there are duplicate preferences.', async(): Promise<void> => {
      const preferences: RepresentationPreferences =
        { type: [{ value: 'b/x', weight: 1 }, { value: 'b/x', weight: 0 }]};
      expect((): any => matchingMediaTypes(preferences, [ 'b/x' ]))
        .toThrow(new BadRequestHttpError(`Duplicate type preference found: b/x`));
    });

    it('errors if there invalid types.', async(): Promise<void> => {
      const preferences: RepresentationPreferences =
        { type: [{ value: 'b/x', weight: 1 }]};
      expect((): any => matchingMediaTypes(preferences, [ 'noType' ]))
        .toThrow(new InternalServerError(`Unexpected type preference: noType`));
    });

    it('filters out internal types.', async(): Promise<void> => {
      const preferences: RepresentationPreferences = { type: [{ value: '*/*', weight: 1 }]};
      expect(matchingMediaTypes(preferences, [ 'a/x', 'internal/quads' ])).toEqual([{ value: 'a/x', weight: 1 }]);
    });

    it('keeps internal types that are specifically requested.', async(): Promise<void> => {
      const preferences: RepresentationPreferences =
        { type: [{ value: '*/*', weight: 1 }, { value: 'internal/*', weight: 0.5 }]};
      expect(matchingMediaTypes(preferences, [ 'a/x', 'internal/quads' ]))
        .toEqual([{ value: 'a/x', weight: 1 }, { value: 'internal/quads', weight: 0.5 }]);
    });

    it('takes the most relevant weight for a type.', async(): Promise<void> => {
      const preferences: RepresentationPreferences =
        { type: [{ value: '*/*', weight: 1 }, { value: 'internal/quads', weight: 0.5 }]};
      expect(matchingMediaTypes(preferences, [ 'a/x', 'internal/quads' ]))
        .toEqual([{ value: 'a/x', weight: 1 }, { value: 'internal/quads', weight: 0.5 }]);
    });
  });

  describe('#matchesMediaType', (): void => {
    it('matches all possible media types.', async(): Promise<void> => {
      expect(matchesMediaType('*/*', 'text/turtle')).toBeTruthy();
      expect(matchesMediaType('text/*', '*/*')).toBeTruthy();
      expect(matchesMediaType('text/*', 'text/turtle')).toBeTruthy();
      expect(matchesMediaType('text/plain', 'text/*')).toBeTruthy();
      expect(matchesMediaType('text/turtle', 'text/turtle')).toBeTruthy();

      expect(matchesMediaType('text/*', 'application/*')).toBeFalsy();
      expect(matchesMediaType('text/plain', 'application/*')).toBeFalsy();
      expect(matchesMediaType('text/plain', 'text/turtle')).toBeFalsy();
    });
  });
});
