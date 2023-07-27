import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import { BasicConditions } from '../../../../src/storage/conditions/BasicConditions';
import type { ETagHandler } from '../../../../src/storage/conditions/ETagHandler';
import { DC } from '../../../../src/util/Vocabularies';

describe('A BasicConditions', (): void => {
  const now = new Date(2020, 10, 20);
  const tomorrow = new Date(2020, 10, 21);
  const yesterday = new Date(2020, 10, 19);
  const eTag = `"${now.getTime()}-text/turtle"`;
  let eTagHandler: jest.Mocked<ETagHandler>;
  let metadata: RepresentationMetadata;

  beforeEach(async(): Promise<void> => {
    eTagHandler = {
      getETag: jest.fn(),
      matchesETag: jest.fn().mockReturnValue(true),
      sameResourceState: jest.fn(),
    };

    metadata = new RepresentationMetadata({ [DC.modified]: `${now.toISOString()}` });
  });

  it('copies the input parameters.', async(): Promise<void> => {
    const eTags = [ '123456', 'abcdefg' ];
    const options = { matchesETag: eTags, notMatchesETag: eTags, modifiedSince: now, unmodifiedSince: now };
    expect(new BasicConditions(eTagHandler, options)).toMatchObject(options);
  });

  it('always returns false if notMatchesETag contains *.', async(): Promise<void> => {
    const conditions = new BasicConditions(eTagHandler, { notMatchesETag: [ '*' ]});
    expect(conditions.matchesMetadata(new RepresentationMetadata())).toBe(false);
  });

  it('requires matchesETag to match the provided ETag with the metadata.', async(): Promise<void> => {
    const conditions = new BasicConditions(eTagHandler, { matchesETag: [ eTag ]});
    expect(conditions.matchesMetadata(metadata)).toBe(true);
    expect(eTagHandler.matchesETag).toHaveBeenCalledTimes(1);
    expect(eTagHandler.matchesETag).toHaveBeenLastCalledWith(metadata, eTag, false);

    eTagHandler.matchesETag.mockReturnValue(false);
    expect(conditions.matchesMetadata(metadata)).toBe(false);
    expect(eTagHandler.matchesETag).toHaveBeenCalledTimes(2);
    expect(eTagHandler.matchesETag).toHaveBeenLastCalledWith(metadata, eTag, false);
  });

  it('calls the ETagHandler in strict mode if required.', async(): Promise<void> => {
    const conditions = new BasicConditions(eTagHandler, { matchesETag: [ eTag ]});
    expect(conditions.matchesMetadata(metadata, true)).toBe(true);
    expect(eTagHandler.matchesETag).toHaveBeenCalledTimes(1);
    expect(eTagHandler.matchesETag).toHaveBeenLastCalledWith(metadata, eTag, true);
  });

  it('supports all ETags if matchesETag contains *.', async(): Promise<void> => {
    eTagHandler.matchesETag.mockReturnValue(false);
    const conditions = new BasicConditions(eTagHandler, { matchesETag: [ '*' ]});
    expect(conditions.matchesMetadata(metadata, true)).toBe(true);
    expect(eTagHandler.matchesETag).toHaveBeenCalledTimes(0);
  });

  it('requires notMatchesETag to not match the provided ETag with the metadata.', async(): Promise<void> => {
    const conditions = new BasicConditions(eTagHandler, { notMatchesETag: [ eTag ]});
    expect(conditions.matchesMetadata(metadata)).toBe(false);
    expect(eTagHandler.matchesETag).toHaveBeenCalledTimes(1);
    expect(eTagHandler.matchesETag).toHaveBeenLastCalledWith(metadata, eTag, false);

    eTagHandler.matchesETag.mockReturnValue(false);
    expect(conditions.matchesMetadata(metadata)).toBe(true);
    expect(eTagHandler.matchesETag).toHaveBeenCalledTimes(2);
    expect(eTagHandler.matchesETag).toHaveBeenLastCalledWith(metadata, eTag, false);
  });

  it('requires lastModified to be after modifiedSince.', async(): Promise<void> => {
    const conditions = new BasicConditions(eTagHandler, { modifiedSince: now });
    metadata.set(DC.terms.modified, yesterday.toISOString());
    expect(conditions.matchesMetadata(metadata)).toBe(false);

    metadata.set(DC.terms.modified, tomorrow.toISOString());
    expect(conditions.matchesMetadata(metadata)).toBe(true);
  });

  it('requires lastModified to be before unmodifiedSince.', async(): Promise<void> => {
    const conditions = new BasicConditions(eTagHandler, { unmodifiedSince: now });
    metadata.set(DC.terms.modified, yesterday.toISOString());
    expect(conditions.matchesMetadata(metadata)).toBe(true);

    metadata.set(DC.terms.modified, tomorrow.toISOString());
    expect(conditions.matchesMetadata(metadata)).toBe(false);
  });

  it('checks if matchesETag contains * for resources that do not exist.', async(): Promise<void> => {
    expect(new BasicConditions(eTagHandler, { matchesETag: [ '*' ]}).matchesMetadata()).toBe(false);
    expect(new BasicConditions(eTagHandler, {}).matchesMetadata()).toBe(true);
  });
});
