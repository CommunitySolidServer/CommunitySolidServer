import { RepresentationMetadata } from '../../../src/http/representation/RepresentationMetadata';
import { BasicConditions } from '../../../src/storage/BasicConditions';
import { getETag } from '../../../src/storage/Conditions';
import { CONTENT_TYPE, DC } from '../../../src/util/Vocabularies';

function getMetadata(modified: Date, type = 'application/ld+json'): RepresentationMetadata {
  return new RepresentationMetadata({
    [DC.modified]: `${modified.toISOString()}`,
    [CONTENT_TYPE]: type,
  });
}

describe('A BasicConditions', (): void => {
  const now = new Date(2020, 10, 20);
  const tomorrow = new Date(2020, 10, 21);
  const yesterday = new Date(2020, 10, 19);
  const turtleTag = getETag(getMetadata(now, 'text/turtle'))!;
  const jsonLdTag = getETag(getMetadata(now))!;

  it('copies the input parameters.', async(): Promise<void> => {
    const eTags = [ '123456', 'abcdefg' ];
    const options = { matchesETag: eTags, notMatchesETag: eTags, modifiedSince: now, unmodifiedSince: now };
    expect(new BasicConditions(options)).toMatchObject(options);
  });

  it('always returns false if notMatchesETag contains *.', async(): Promise<void> => {
    const conditions = new BasicConditions({ notMatchesETag: [ '*' ]});
    expect(conditions.matchesMetadata(new RepresentationMetadata())).toBe(false);
  });

  it('requires matchesETag to match the provided ETag timestamp.', async(): Promise<void> => {
    const conditions = new BasicConditions({ matchesETag: [ turtleTag ]});
    expect(conditions.matchesMetadata(getMetadata(yesterday))).toBe(false);
    expect(conditions.matchesMetadata(getMetadata(now))).toBe(true);
  });

  it('requires matchesETag to match the exact provided ETag in strict mode.', async(): Promise<void> => {
    const turtleConditions = new BasicConditions({ matchesETag: [ turtleTag ]});
    const jsonLdConditions = new BasicConditions({ matchesETag: [ jsonLdTag ]});
    expect(turtleConditions.matchesMetadata(getMetadata(now), true)).toBe(false);
    expect(jsonLdConditions.matchesMetadata(getMetadata(now), true)).toBe(true);
  });

  it('supports all ETags if matchesETag contains *.', async(): Promise<void> => {
    const conditions = new BasicConditions({ matchesETag: [ '*' ]});
    expect(conditions.matchesMetadata(getMetadata(yesterday))).toBe(true);
    expect(conditions.matchesMetadata(getMetadata(now))).toBe(true);
  });

  it('requires notMatchesETag to not match the provided ETag timestamp.', async(): Promise<void> => {
    const conditions = new BasicConditions({ notMatchesETag: [ turtleTag ]});
    expect(conditions.matchesMetadata(getMetadata(yesterday))).toBe(true);
    expect(conditions.matchesMetadata(getMetadata(now))).toBe(false);
  });

  it('requires notMatchesETag to not match the exact provided ETag in strict mode.', async(): Promise<void> => {
    const turtleConditions = new BasicConditions({ notMatchesETag: [ turtleTag ]});
    const jsonLdConditions = new BasicConditions({ notMatchesETag: [ jsonLdTag ]});
    expect(turtleConditions.matchesMetadata(getMetadata(now), true)).toBe(true);
    expect(jsonLdConditions.matchesMetadata(getMetadata(now), true)).toBe(false);
  });

  it('requires lastModified to be after modifiedSince.', async(): Promise<void> => {
    const conditions = new BasicConditions({ modifiedSince: now });
    expect(conditions.matchesMetadata(getMetadata(yesterday))).toBe(false);
    expect(conditions.matchesMetadata(getMetadata(tomorrow))).toBe(true);
  });

  it('requires lastModified to be before unmodifiedSince.', async(): Promise<void> => {
    const conditions = new BasicConditions({ unmodifiedSince: now });
    expect(conditions.matchesMetadata(getMetadata(yesterday))).toBe(true);
    expect(conditions.matchesMetadata(getMetadata(tomorrow))).toBe(false);
  });

  it('matches if no date is found in the metadata.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata({ [CONTENT_TYPE]: 'text/turtle' });
    const conditions = new BasicConditions({
      modifiedSince: yesterday,
      unmodifiedSince: tomorrow,
      notMatchesETag: [ '123456' ],
    });
    expect(conditions.matchesMetadata(metadata)).toBe(true);
  });

  it('checks if matchesETag contains * for resources that do not exist.', async(): Promise<void> => {
    expect(new BasicConditions({ matchesETag: [ '*' ]}).matchesMetadata()).toBe(false);
    expect(new BasicConditions({}).matchesMetadata()).toBe(true);
  });
});
