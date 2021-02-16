import type { Representation } from '../../../../src/ldp/representation/Representation';
import { IfNeededConverter } from '../../../../src/storage/conversion/IfNeededConverter';
import type {
  RepresentationConverter,
} from '../../../../src/storage/conversion/RepresentationConverter';

describe('An IfNeededConverter', (): void => {
  const identifier = { path: 'identifier' };
  const representation: Representation = {
    metadata: { contentType: 'text/turtle' },
  } as any;
  const converted = {
    metadata: { contentType: 'application/ld+json' },
  };

  const innerConverter: jest.Mocked<RepresentationConverter> = {
    canHandle: jest.fn().mockResolvedValue(true),
    handle: jest.fn().mockResolvedValue(converted),
    handleSafe: jest.fn().mockResolvedValue(converted),
  } as any;

  const converter = new IfNeededConverter(innerConverter);

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it('performs no conversion when there are no content type preferences.', async(): Promise<void> => {
    const preferences = {};
    const args = { identifier, representation, preferences };

    await expect(converter.canHandle(args)).resolves.toBeUndefined();
    await expect(converter.handle(args)).resolves.toBe(representation);
    await expect(converter.handleSafe(args)).resolves.toBe(representation);

    expect(innerConverter.canHandle).toHaveBeenCalledTimes(0);
    expect(innerConverter.handle).toHaveBeenCalledTimes(0);
    expect(innerConverter.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('performs conversion when there are no preferences but the content-type is internal.', async(): Promise<void> => {
    const preferences = {};
    const internalRepresentation = {
      metadata: { contentType: 'internal/quads' },
    } as any;
    const args = { identifier, representation: internalRepresentation, preferences };

    await expect(converter.handleSafe(args)).resolves.toBe(converted);

    expect(innerConverter.canHandle).toHaveBeenCalledTimes(0);
    expect(innerConverter.handle).toHaveBeenCalledTimes(0);
    expect(innerConverter.handleSafe).toHaveBeenCalledTimes(1);
    expect(innerConverter.handleSafe).toHaveBeenCalledWith(args);
  });

  it('errors if no content type is specified on the representation.', async(): Promise<void> => {
    const preferences = { type: { 'text/turtle': 1 }};
    const args = { identifier, representation: { metadata: {}} as any, preferences };

    await expect(converter.handleSafe(args)).rejects
      .toThrow('Content-Type is required for data conversion.');

    expect(innerConverter.canHandle).toHaveBeenCalledTimes(0);
    expect(innerConverter.handle).toHaveBeenCalledTimes(0);
    expect(innerConverter.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('performs no conversion when the content type matches the preferences.', async(): Promise<void> => {
    const preferences = { type: { 'text/turtle': 1 }};
    const args = { identifier, representation, preferences };

    await expect(converter.handleSafe(args)).resolves.toBe(representation);

    expect(innerConverter.canHandle).toHaveBeenCalledTimes(0);
    expect(innerConverter.handle).toHaveBeenCalledTimes(0);
    expect(innerConverter.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('performs a conversion when the content type matches the preferences.', async(): Promise<void> => {
    const preferences = { type: { 'text/turtle': 0 }};
    const args = { identifier, representation, preferences };

    await expect(converter.handleSafe(args)).resolves.toBe(converted);

    expect(innerConverter.canHandle).toHaveBeenCalledTimes(0);
    expect(innerConverter.handle).toHaveBeenCalledTimes(0);
    expect(innerConverter.handleSafe).toHaveBeenCalledTimes(1);
    expect(innerConverter.handleSafe).toHaveBeenCalledWith(args);
  });

  it('does not support conversion when the inner converter does not support it.', async(): Promise<void> => {
    const preferences = { type: { 'text/turtle': 0 }};
    const args = { identifier, representation, preferences };
    const error = new Error('unsupported');
    innerConverter.canHandle.mockRejectedValueOnce(error);

    await expect(converter.canHandle(args)).rejects.toThrow(error);

    expect(innerConverter.canHandle).toHaveBeenCalledTimes(1);
    expect(innerConverter.canHandle).toHaveBeenCalledWith(args);
  });

  it('supports conversion when the inner converter supports it.', async(): Promise<void> => {
    const preferences = { type: { 'text/turtle': 0 }};
    const args = { identifier, representation, preferences };

    await expect(converter.canHandle(args)).resolves.toBeUndefined();

    expect(innerConverter.canHandle).toHaveBeenCalledTimes(1);
    expect(innerConverter.canHandle).toHaveBeenCalledWith(args);

    await expect(converter.handle(args)).resolves.toBe(converted);

    expect(innerConverter.canHandle).toHaveBeenCalledTimes(1);
    expect(innerConverter.handle).toHaveBeenCalledTimes(1);
    expect(innerConverter.handle).toHaveBeenCalledWith(args);
  });

  it('does not support conversion when there is no inner converter.', async(): Promise<void> => {
    const emptyConverter = new IfNeededConverter();
    const preferences = { type: { 'text/turtle': 0 }};
    const args = { identifier, representation, preferences };

    await expect(emptyConverter.canHandle(args)).rejects
      .toThrow('The content type does not match the preferences');
    await expect(emptyConverter.handle(args)).rejects
      .toThrow('The content type does not match the preferences');
    await expect(emptyConverter.handleSafe(args)).rejects
      .toThrow('The content type does not match the preferences');
  });
});
