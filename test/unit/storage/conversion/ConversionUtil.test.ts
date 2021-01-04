import type { Representation } from '../../../../src/ldp/representation/Representation';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';
import type {
  ValuePreferences,
  RepresentationPreferences,
} from '../../../../src/ldp/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../../../../src/ldp/representation/ResourceIdentifier';
import {
  matchesMediaType,
  matchingMediaTypes,
  supportsConversion,
} from '../../../../src/storage/conversion/ConversionUtil';
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
      expect((): any => supportsConversion({ identifier, representation, preferences },
        { 'a/x': 1 },
        { 'a/x': 1 }))
        .toThrow('No content type indicated on request.');
    });

    it('requires a matching input type.', async(): Promise<void> => {
      metadata.contentType = 'a/x';
      const preferences: RepresentationPreferences =
        { type: { 'b/x': 1 }};
      expect((): any => supportsConversion({ identifier, representation, preferences },
        { 'c/x': 1 },
        { 'a/x': 1 }))
        .toThrow('Can only convert from c/x to a/x.');
    });

    it('requires a matching output type.', async(): Promise<void> => {
      metadata.contentType = 'a/x';
      const preferences: RepresentationPreferences =
        { type: { 'b/x': 1 }};
      expect((): any => supportsConversion({ identifier, representation, preferences },
        { 'a/x': 1 },
        { 'c/x': 1 }))
        .toThrow('Can only convert from a/x to c/x.');
    });

    it('succeeds with a valid input and output type.', async(): Promise<void> => {
      metadata.contentType = 'a/x';
      const preferences: RepresentationPreferences =
        { type: { 'b/x': 1 }};
      expect(supportsConversion({ identifier, representation, preferences },
        { 'a/x': 1 },
        { 'b/x': 1 }))
        .toBeUndefined();
    });
  });

  describe('#matchingMediaTypes', (): void => {
    it('returns the empty array if no preferences specified.', async(): Promise<void> => {
      expect(matchingMediaTypes())
        .toEqual([]);
    });

    it('returns matching types if weight > 0.', async(): Promise<void> => {
      const preferences: ValuePreferences = { 'a/x': 1, 'b/x': 0.5, 'c/x': 0 };
      expect(matchingMediaTypes(preferences, { 'b/x': 1, 'c/x': 1 }))
        .toEqual([ 'b/x' ]);
    });

    it('sorts by descending weight.', async(): Promise<void> => {
      const preferences: ValuePreferences = { 'a/x': 1, 'b/x': 0.5, 'c/x': 0.8 };
      expect(matchingMediaTypes(preferences, { 'a/x': 1, 'b/x': 1, 'c/x': 1 }))
        .toEqual([ 'a/x', 'c/x', 'b/x' ]);
    });

    it('incorporates representation qualities when calculating weight.', async(): Promise<void> => {
      const preferences: ValuePreferences = { 'a/x': 1, 'b/x': 0.5, 'c/x': 0.8 };
      expect(matchingMediaTypes(preferences, { 'a/x': 0.1, 'b/x': 1, 'c/x': 0.6 }))
        .toEqual([ 'b/x', 'c/x', 'a/x' ]);
    });

    it('errors if there invalid types.', async(): Promise<void> => {
      const preferences: ValuePreferences = { 'b/x': 1 };
      expect((): any => matchingMediaTypes(preferences, { noType: 1 }))
        .toThrow(new InternalServerError(`Unexpected type preference: noType`));
    });

    it('filters out internal types.', async(): Promise<void> => {
      const preferences: ValuePreferences = { '*/*': 1 };
      expect(matchingMediaTypes(preferences, { 'a/x': 1, 'internal/quads': 1 }))
        .toEqual([ 'a/x' ]);
    });

    it('keeps internal types that are specifically requested.', async(): Promise<void> => {
      const preferences: ValuePreferences = { '*/*': 1, 'internal/*': 0.5 };
      expect(matchingMediaTypes(preferences, { 'a/x': 1, 'internal/quads': 1 }))
        .toEqual([ 'a/x', 'internal/quads' ]);
    });

    it('takes the most relevant weight for a type.', async(): Promise<void> => {
      const preferences: ValuePreferences = { '*/*': 1, 'internal/quads': 0.5 };
      expect(matchingMediaTypes(preferences, { 'a/x': 1, 'internal/quads': 1 }))
        .toEqual([ 'a/x', 'internal/quads' ]);
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
