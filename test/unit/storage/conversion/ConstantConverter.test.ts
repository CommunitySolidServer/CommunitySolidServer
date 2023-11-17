import fs from 'node:fs';
import fsExtra from 'fs-extra';
import arrayifyStream from 'arrayify-stream';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import type { ConstantConverterOptions } from '../../../../src/storage/conversion/ConstantConverter';
import { ConstantConverter } from '../../../../src/storage/conversion/ConstantConverter';
import { CONTENT_TYPE, POSIX } from '../../../../src/util/Vocabularies';

const createReadStream = jest.spyOn(fs, 'createReadStream').mockReturnValue('file contents' as any);
const stat = jest.spyOn(fsExtra, 'stat').mockReturnValue({ size: 100 } as any);

describe('A ConstantConverter', (): void => {
  const identifier = { path: 'identifier' };
  let options: ConstantConverterOptions;
  let converter: ConstantConverter;

  beforeEach(async(): Promise<void> => {
    jest.clearAllMocks();
    options = { container: true, document: true, minQuality: 1, enabledMediaRanges: [ '*/*' ], disabledMediaRanges: []};
    converter = new ConstantConverter('abc/def/index.html', 'text/html', options);
  });

  it('does not support requests without content type preferences.', async(): Promise<void> => {
    const preferences = {};
    const representation = {} as any;
    const args = { identifier, representation, preferences };

    await expect(converter.canHandle(args)).rejects.toThrow('No content type preferences specified');
  });

  it('does not support requests targeting documents if disabled in the options.', async(): Promise<void> => {
    const preferences = { type: { 'text/html': 1 }};
    const representation = { metadata: new RepresentationMetadata() } as any;
    const args = { identifier, representation, preferences };

    converter = new ConstantConverter('abc/def/index.html', 'text/html', { document: false });

    await expect(converter.canHandle(args)).rejects.toThrow('Documents are not supported');
  });

  it('does not support requests targeting containers if disabled in the options.', async(): Promise<void> => {
    const preferences = { type: { 'text/html': 1 }};
    const representation = { metadata: new RepresentationMetadata() } as any;
    const args = { identifier: { path: 'container/' }, representation, preferences };

    converter = new ConstantConverter('abc/def/index.html', 'text/html', { container: false });

    await expect(converter.canHandle(args)).rejects.toThrow('Containers are not supported');
  });

  it('does not support requests without matching content type preference.', async(): Promise<void> => {
    const preferences = { type: { 'text/turtle': 1 }};
    const representation = {} as any;
    const args = { identifier, representation, preferences };

    await expect(converter.canHandle(args)).rejects.toThrow('No preference for text/html');
  });

  it('does not support requests not reaching the minimum preference quality.', async(): Promise<void> => {
    const preferences = { type: { 'text/html': 0.9 }};
    const representation = {} as any;
    const args = { identifier, representation, preferences };

    await expect(converter.canHandle(args)).rejects.toThrow('Preference is lower than the specified minimum quality');
  });

  it('does not support representations that are already in the right format.', async(): Promise<void> => {
    const preferences = { type: { 'text/html': 1 }};
    const metadata = new RepresentationMetadata({ [CONTENT_TYPE]: 'text/html' });
    const representation = { metadata } as any;
    const args = { identifier, representation, preferences };

    await expect(converter.canHandle(args)).rejects.toThrow('Representation is already text/html');
  });

  it('does not support representations if their content-type is not enabled.', async(): Promise<void> => {
    const preferences = { type: { 'text/html': 1 }};
    const representation = { metadata: new RepresentationMetadata({ [CONTENT_TYPE]: 'text/plain' }) } as any;
    const args = { identifier: { path: 'container/' }, representation, preferences };

    converter = new ConstantConverter('abc/def/index.html', 'text/html', { enabledMediaRanges: [ 'text/turtle' ]});

    await expect(converter.canHandle(args)).rejects.toThrow('text/plain is not one of the enabled media types.');
  });

  it('does not support representations if their content-type is disabled.', async(): Promise<void> => {
    const preferences = { type: { 'text/html': 1 }};
    const representation = { metadata: new RepresentationMetadata({ [CONTENT_TYPE]: 'text/plain' }) } as any;
    const args = { identifier: { path: 'container/' }, representation, preferences };

    converter = new ConstantConverter('abc/def/index.html', 'text/html', { disabledMediaRanges: [ 'text/*' ]});

    await expect(converter.canHandle(args)).rejects.toThrow('text/plain is one of the disabled media types.');
  });

  it('supports representations with an unknown content type.', async(): Promise<void> => {
    const preferences = { type: { 'text/html': 1 }};
    const metadata = new RepresentationMetadata();
    const representation = { metadata } as any;
    const args = { identifier, representation, preferences };

    await expect(converter.canHandle(args)).resolves.toBeUndefined();
  });

  it('replaces the representation of a supported request and replaces the size.', async(): Promise<void> => {
    const preferences = { type: { 'text/html': 1 }};
    const metadata = new RepresentationMetadata({ [CONTENT_TYPE]: 'text/turtle' });
    const representation = { metadata, data: { destroy: jest.fn() }} as any;
    const args = { identifier, representation, preferences };

    await expect(converter.canHandle(args)).resolves.toBeUndefined();
    const converted = await converter.handle(args);

    expect(representation.data.destroy).toHaveBeenCalledTimes(1);

    expect(createReadStream).toHaveBeenCalledTimes(1);
    expect(createReadStream).toHaveBeenCalledWith('abc/def/index.html', 'utf8');

    expect(converted.metadata.contentType).toBe('text/html');
    expect(converted.metadata.get(POSIX.terms.size)?.value).toBe('100');
    await expect(arrayifyStream(converted.data)).resolves.toEqual([ 'file contents' ]);
  });

  it('throws an internal error if the file cannot be accessed.', async(): Promise<void> => {
    const preferences = { type: { 'text/html': 1 }};
    const metadata = new RepresentationMetadata({ [CONTENT_TYPE]: 'text/turtle' });
    const representation = { metadata, data: { destroy: jest.fn() }} as any;
    const args = { identifier, representation, preferences };

    await expect(converter.canHandle(args)).resolves.toBeUndefined();

    // eslint-disable-next-line ts/no-misused-promises
    stat.mockImplementation(async(): Promise<never> => {
      throw new Error('file not found');
    });

    await expect(converter.handle(args)).rejects.toThrow('Unable to access file used for constant conversion.');
    expect(representation.data.destroy).toHaveBeenCalledTimes(1);
    expect(createReadStream).toHaveBeenCalledTimes(0);
  });

  it('defaults to the most permissive options.', async(): Promise<void> => {
    const preferences = { type: { 'text/html': 0.1 }};
    const metadata = new RepresentationMetadata();
    const representation = { metadata } as any;
    const args = { identifier, representation, preferences };

    converter = new ConstantConverter('abc/def/index.html', 'text/html');

    await expect(converter.canHandle(args)).resolves.toBeUndefined();

    args.identifier = { path: 'container/' };
    await expect(converter.canHandle(args)).resolves.toBeUndefined();
  });
});
