import { RepresentationMetadata } from '../../../src/http/representation/RepresentationMetadata';
import { BasicConditions } from '../../../src/storage/BasicConditions';
import { getETag } from '../../../src/storage/Conditions';
import { DC } from '../../../src/util/Vocabularies';

describe('A BasicConditions', (): void => {
  const now = new Date(2020, 10, 20);
  const tomorrow = new Date(2020, 10, 21);
  const yesterday = new Date(2020, 10, 19);
  const eTags = [ '123456', 'abcdefg' ];

  it('copies the input parameters.', async(): Promise<void> => {
    const options = { matchesETag: eTags, notMatchesETag: eTags, modifiedSince: now, unmodifiedSince: now };
    expect(new BasicConditions(options)).toMatchObject(options);
  });

  it('always returns false if notMatchesETag contains *.', async(): Promise<void> => {
    const conditions = new BasicConditions({ notMatchesETag: [ '*' ]});
    expect(conditions.matches()).toBe(false);
  });

  it('requires matchesETag to contain the provided ETag.', async(): Promise<void> => {
    const conditions = new BasicConditions({ matchesETag: [ '1234' ]});
    expect(conditions.matches('abcd')).toBe(false);
    expect(conditions.matches('1234')).toBe(true);
  });

  it('supports all ETags if matchesETag contains *.', async(): Promise<void> => {
    const conditions = new BasicConditions({ matchesETag: [ '*' ]});
    expect(conditions.matches('abcd')).toBe(true);
    expect(conditions.matches('1234')).toBe(true);
  });

  it('requires notMatchesETag to not contain the provided ETag.', async(): Promise<void> => {
    const conditions = new BasicConditions({ notMatchesETag: [ '1234' ]});
    expect(conditions.matches('1234')).toBe(false);
    expect(conditions.matches('abcd')).toBe(true);
  });

  it('requires lastModified to be after modifiedSince.', async(): Promise<void> => {
    const conditions = new BasicConditions({ modifiedSince: now });
    expect(conditions.matches(undefined, yesterday)).toBe(false);
    expect(conditions.matches(undefined, tomorrow)).toBe(true);
  });

  it('requires lastModified to be before unmodifiedSince.', async(): Promise<void> => {
    const conditions = new BasicConditions({ unmodifiedSince: now });
    expect(conditions.matches(undefined, tomorrow)).toBe(false);
    expect(conditions.matches(undefined, yesterday)).toBe(true);
  });

  it('can match based on the last modified date in the metadata.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata({ [DC.modified]: now.toISOString() });
    const conditions = new BasicConditions({
      modifiedSince: yesterday,
      unmodifiedSince: tomorrow,
      matchesETag: [ getETag(metadata)! ],
      notMatchesETag: [ '123456' ],
    });
    expect(conditions.matchesMetadata(metadata)).toBe(true);
  });

  it('matches if no date is found in the metadata.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata();
    const conditions = new BasicConditions({
      modifiedSince: yesterday,
      unmodifiedSince: tomorrow,
      matchesETag: [ getETag(metadata)! ],
      notMatchesETag: [ '123456' ],
    });
    expect(conditions.matchesMetadata(metadata)).toBe(true);
  });

  it('checks if matchesETag contains * for resources that do not exist.', async(): Promise<void> => {
    expect(new BasicConditions({ matchesETag: [ '*' ]}).matchesMetadata()).toBe(false);
    expect(new BasicConditions({}).matchesMetadata()).toBe(true);
  });
});
