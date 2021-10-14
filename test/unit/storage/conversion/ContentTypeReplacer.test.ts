import 'jest-rdf';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import { ContentTypeReplacer } from '../../../../src/storage/conversion/ContentTypeReplacer';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

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
    const metadata = new RepresentationMetadata({ contentType: 'text/plain' });
    const representation = { metadata };
    const preferences = { type: { 'application/json': 1 }};

    const result = converter.canHandle({ representation, preferences } as any);
    await expect(result).rejects.toThrow(NotImplementedHttpError);
    await expect(result).rejects.toThrow('Cannot convert from text/plain to application/json');
  });

  it('throws on an unsupported output type.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata({ contentType: 'application/n-triples' });
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
    const metadata = new RepresentationMetadata({ contentType: 'application/n-triples' });
    const representation = { binary, data, metadata };
    const preferences = {};

    const result = await converter.handleSafe({ representation, preferences } as any);
    expect(result.binary).toBe(binary);
    expect(result.data).toBe(data);
    expect(result.metadata.contentType).toBe('text/turtle');
  });

  it('replaces a supported content type when preferences are given.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata({ contentType: 'application/n-triples' });
    const representation = { binary, data, metadata };
    const preferences = { type: { 'application/n-quads': 1 }};

    const result = await converter.handleSafe({ representation, preferences } as any);
    expect(result.binary).toBe(binary);
    expect(result.data).toBe(data);
    expect(result.metadata.contentType).toBe('application/n-quads');
  });

  it('replaces a supported wildcard type.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata({ contentType: 'text/plain' });
    const representation = { binary, data, metadata };
    const preferences = { type: { 'application/octet-stream': 1 }};

    const result = await converter.handleSafe({ representation, preferences } as any);
    expect(result.binary).toBe(binary);
    expect(result.data).toBe(data);
    expect(result.metadata.contentType).toBe('application/octet-stream');
  });

  it('picks the most preferred content type.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata({ contentType: 'application/n-triples' });
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
});
