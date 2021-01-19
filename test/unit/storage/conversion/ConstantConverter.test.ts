import { promises as fs } from 'fs';
import arrayifyStream from 'arrayify-stream';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';
import { ConstantConverter } from '../../../../src/storage/conversion/ConstantConverter';

const readFile = jest.spyOn(fs, 'readFile').mockResolvedValue('file contents');

describe('A ConstantConverter', (): void => {
  const identifier = { path: 'identifier' };

  const converter = new ConstantConverter('abc/def/index.html', 'text/html');

  it('does not support requests without content type preferences.', async(): Promise<void> => {
    const preferences = {};
    const representation = {} as any;
    const args = { identifier, representation, preferences };

    await expect(converter.canHandle(args)).rejects
      .toThrow('No content type preferences specified');
  });

  it('does not support requests without matching content type preference.', async(): Promise<void> => {
    const preferences = { type: { 'text/turtle': 1 }};
    const representation = {} as any;
    const args = { identifier, representation, preferences };

    await expect(converter.canHandle(args)).rejects
      .toThrow('No preference for text/html');
  });

  it('does not support representations that are already in the right format.', async(): Promise<void> => {
    const preferences = { type: { 'text/html': 1 }};
    const metadata = new RepresentationMetadata({ contentType: 'text/html' });
    const representation = { metadata } as any;
    const args = { identifier, representation, preferences };

    await expect(converter.canHandle(args)).rejects
      .toThrow('Representation is already text/html');
  });

  it('supports representations with an unknown content type.', async(): Promise<void> => {
    const preferences = { type: { 'text/html': 1 }};
    const metadata = new RepresentationMetadata();
    const representation = { metadata } as any;
    const args = { identifier, representation, preferences };

    await expect(converter.canHandle(args)).resolves.toBeUndefined();
  });

  it('replaces the representation of a supported request.', async(): Promise<void> => {
    const preferences = { type: { 'text/html': 1 }};
    const metadata = new RepresentationMetadata({ contentType: 'text/turtle' });
    const representation = { metadata, data: { destroy: jest.fn() }} as any;
    const args = { identifier, representation, preferences };

    await expect(converter.canHandle(args)).resolves.toBeUndefined();
    const converted = await converter.handle(args);

    expect(representation.data.destroy).toHaveBeenCalledTimes(1);

    expect(readFile).toHaveBeenCalledTimes(1);
    expect(readFile).toHaveBeenCalledWith('abc/def/index.html', 'utf8');

    expect(converted.metadata.contentType).toBe('text/html');
    expect(await arrayifyStream(converted.data)).toEqual([ 'file contents' ]);
  });
});
