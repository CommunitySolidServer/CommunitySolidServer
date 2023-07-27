import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import { BasicETagHandler } from '../../../../src/storage/conditions/BasicETagHandler';
import { DC } from '../../../../src/util/Vocabularies';

describe('A BasicETagHandler', (): void => {
  const now = new Date();
  const contentType = 'text/turtle';
  const eTag = `"${now.getTime()}-${contentType}"`;
  let metadata: RepresentationMetadata;
  const handler = new BasicETagHandler();

  beforeEach(async(): Promise<void> => {
    metadata = new RepresentationMetadata();
    metadata.add(DC.terms.modified, now.toISOString());
    metadata.contentType = 'text/turtle';
  });

  it('can generate ETags.', async(): Promise<void> => {
    expect(handler.getETag(metadata)).toBe(eTag);
  });

  it('does not generate an ETag if the last modified date is missing.', async(): Promise<void> => {
    metadata.removeAll(DC.terms.modified);
    expect(handler.getETag(metadata)).toBeUndefined();
  });

  it('does not generate an ETag if the content-type is missing.', async(): Promise<void> => {
    metadata.contentType = undefined;
    expect(handler.getETag(metadata)).toBeUndefined();
  });

  it('can validate an ETag against metadata.', async(): Promise<void> => {
    expect(handler.matchesETag(metadata, eTag, true)).toBe(true);
  });

  it('requires a last modified date when comparing metadata with an ETag.', async(): Promise<void> => {
    metadata.removeAll(DC.terms.modified);
    expect(handler.matchesETag(metadata, eTag, true)).toBe(false);
  });

  it('requires a content type when comparing metadata with an ETag.', async(): Promise<void> => {
    metadata.contentType = undefined;
    expect(handler.matchesETag(metadata, eTag, true)).toBe(false);
  });

  it('does not require a content type when comparing metadata with an ETag.', async(): Promise<void> => {
    metadata.contentType = undefined;
    expect(handler.matchesETag(metadata, eTag, false)).toBe(true);
  });

  it('can verify if 2 ETags reference the same resource state.', async(): Promise<void> => {
    expect(handler.sameResourceState(eTag, eTag)).toBe(true);
    expect(handler.sameResourceState(eTag, `"${now.getTime()}-text/plain"`)).toBe(true);
    expect(handler.sameResourceState(eTag, `"${now.getTime() + 1}-${contentType}"`)).toBe(false);
  });
});
