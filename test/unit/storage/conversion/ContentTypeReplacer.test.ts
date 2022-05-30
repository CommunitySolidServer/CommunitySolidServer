import 'jest-rdf';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import { ContentTypeReplacer } from '../../../../src/storage/conversion/ContentTypeReplacer';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { CONTENT_TYPE } from '../../../../src/util/Vocabularies';

const binary = true;
const data = { data: true };

describe('A ContentTypeReplacer', (): void => {
  const converter = new ContentTypeReplacer({
    'application/n-triples': [
      'text/turtle',
      'application/trig',
      'application/n-quads',
    ],
    'application/ld+json': 'application/json',
    'application/json': 'application/octet-stream',
    'application/octet-stream': 'internal/anything',
    'internal/anything': 'application/octet-stream',
    '*/*': 'application/octet-stream',
  });

  it('throws on an unsupported input type.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata({ [CONTENT_TYPE]: 'text/plain' });
    const representation = { metadata };
    const preferences = { type: { 'application/json': 1 }};

    const result = converter.canHandle({ representation, preferences } as any);
    await expect(result).rejects.toThrow(NotImplementedHttpError);
    await expect(result).rejects.toThrow('Cannot convert from text/plain to application/json');
  });

  it('throws on an unsupported output type.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata({ [CONTENT_TYPE]: 'application/n-triples' });
    const representation = { metadata };
    const preferences = { type: { 'application/json': 1 }};

    const result = converter.canHandle({ representation, preferences } as any);
    await expect(result).rejects.toThrow(NotImplementedHttpError);
    await expect(result).rejects.toThrow('Cannot convert from application/n-triples to application/json');
  });

  it('does not replace when no content type is given.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata();
    const representation = { binary, data, metadata };
    const preferences = { type: { 'application/json': 1 }};

    const result = converter.canHandle({ representation, preferences } as any);
    await expect(result).rejects.toThrow(NotImplementedHttpError);
    await expect(result).rejects.toThrow('Cannot convert from unknown to application/json');
  });

  it('replaces a supported content type when no preferences are given.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata({ [CONTENT_TYPE]: 'application/n-triples' });
    const representation = { binary, data, metadata };
    const preferences = {};

    const result = await converter.handleSafe({ representation, preferences } as any);
    expect(result.binary).toBe(binary);
    expect(result.data).toBe(data);
    expect(result.metadata.contentType).toBe('text/turtle');
  });

  it('replaces a supported content type when preferences are given.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata({ [CONTENT_TYPE]: 'application/n-triples' });
    const representation = { binary, data, metadata };
    const preferences = { type: { 'application/n-quads': 1 }};

    const result = await converter.handleSafe({ representation, preferences } as any);
    expect(result.binary).toBe(binary);
    expect(result.data).toBe(data);
    expect(result.metadata.contentType).toBe('application/n-quads');
  });

  it('replaces a supported wildcard type.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata({ [CONTENT_TYPE]: 'text/plain' });
    const representation = { binary, data, metadata };
    const preferences = { type: { 'application/octet-stream': 1 }};

    const result = await converter.handleSafe({ representation, preferences } as any);
    expect(result.binary).toBe(binary);
    expect(result.data).toBe(data);
    expect(result.metadata.contentType).toBe('application/octet-stream');
  });

  it('picks the most preferred content type.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata({ [CONTENT_TYPE]: 'application/n-triples' });
    const representation = { binary, data, metadata };
    const preferences = { type: {
      'text/turtle': 0.5,
      'application/trig': 0.6,
      'application/n-quads': 0.4,
    }};

    const result = await converter.handleSafe({ representation, preferences } as any);
    expect(result.binary).toBe(binary);
    expect(result.data).toBe(data);
    expect(result.metadata.contentType).toBe('application/trig');
  });

  it('returns all matching output types.', async(): Promise<void> => {
    await expect(converter.getOutputTypes('application/n-triples')).resolves.toEqual({
      'text/turtle': 1,
      'application/trig': 1,
      'application/n-quads': 1,
      'application/octet-stream': 1,
      'internal/anything': 1,
    });
  });
});
