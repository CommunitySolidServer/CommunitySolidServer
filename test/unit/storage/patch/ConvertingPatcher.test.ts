import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Patch } from '../../../../src/http/representation/Patch';
import type { Representation } from '../../../../src/http/representation/Representation';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import type {
  RepresentationConverter,
  RepresentationConverterArgs,
} from '../../../../src/storage/conversion/RepresentationConverter';
import { ConvertingPatcher } from '../../../../src/storage/patch/ConvertingPatcher';
import type {
  RepresentationPatcher,
  RepresentationPatcherInput,
} from '../../../../src/storage/patch/RepresentationPatcher';

describe('A ConvertingPatcher', (): void => {
  const intermediateType = 'internal/quads';
  const defaultType = 'text/turtle';
  const identifier: ResourceIdentifier = { path: 'http://test.com/foo' };
  const patch: Patch = new BasicRepresentation([], 'type/patch');
  const representation = new BasicRepresentation([], 'application/trig');
  const patchResult = new BasicRepresentation([], 'internal/quads');
  let args: RepresentationPatcherInput<Representation>;
  let converter: jest.Mocked<RepresentationConverter>;
  let patcher: jest.Mocked<RepresentationPatcher<Representation>>;
  let convertingPatcher: ConvertingPatcher;

  beforeEach(async(): Promise<void> => {
    args = { patch, identifier, representation };

    converter = {
      canHandle: jest.fn(),
      handle: jest.fn(async({ preferences }: RepresentationConverterArgs): Promise<any> =>
        new BasicRepresentation('converted', Object.keys(preferences.type!)[0])),
    } as any;

    patcher = {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue(patchResult),
    } as any;

    convertingPatcher = new ConvertingPatcher(patcher, converter, intermediateType, defaultType);
  });

  it('rejects requests the converter cannot handle.', async(): Promise<void> => {
    converter.canHandle.mockRejectedValueOnce(new Error('unsupported type'));
    await expect(convertingPatcher.canHandle(args)).rejects.toThrow('unsupported type');
  });

  it('checks if the patcher can handle the input if there is no representation.', async(): Promise<void> => {
    delete args.representation;

    await expect(convertingPatcher.canHandle(args)).resolves.toBeUndefined();

    patcher.canHandle.mockRejectedValueOnce(new Error('unsupported patch'));
    await expect(convertingPatcher.canHandle(args)).rejects.toThrow('unsupported patch');
  });

  it('sends a mock representation with the correct type to the patcher to check support.', async(): Promise<void> => {
    await expect(convertingPatcher.canHandle(args)).resolves.toBeUndefined();
    expect(patcher.canHandle).toHaveBeenCalledTimes(1);
    expect(patcher.canHandle.mock.calls[0][0].representation?.metadata.contentType).toBe(intermediateType);
  });

  it('converts the representation before calling the patcher.', async(): Promise<void> => {
    const result = await convertingPatcher.handle(args);
    expect(result.metadata.contentType).toBe('application/trig');

    // Convert input
    expect(converter.handle).toHaveBeenCalledTimes(2);
    expect(converter.handle).toHaveBeenCalledWith({
      representation,
      identifier,
      preferences: { type: { [intermediateType]: 1 }},
    });

    // Patch
    expect(patcher.handle).toHaveBeenCalledTimes(1);
    expect(patcher.handle)
      .toHaveBeenLastCalledWith({ ...args, representation: await converter.handle.mock.results[0].value });

    // Convert back
    expect(converter.handle).toHaveBeenLastCalledWith({
      representation: patchResult,
      identifier,
      preferences: { type: { 'application/trig': 1 }},
    });
  });

  it('expects the patcher to create a new representation if there is none.', async(): Promise<void> => {
    delete args.representation;

    const result = await convertingPatcher.handle(args);
    expect(result.metadata.contentType).toBe(defaultType);

    // Patch
    expect(patcher.handle).toHaveBeenCalledTimes(1);
    expect(patcher.handle).toHaveBeenLastCalledWith(args);

    // Convert new Representation to default type
    expect(converter.handle).toHaveBeenCalledTimes(1);
    expect(converter.handle).toHaveBeenLastCalledWith({
      representation: patchResult,
      identifier,
      preferences: { type: { [defaultType]: 1 }},
    });
  });

  it('does no conversion if there is no intermediate type.', async(): Promise<void> => {
    convertingPatcher = new ConvertingPatcher(patcher, converter);
    const result = await convertingPatcher.handle(args);
    expect(result.metadata.contentType).toBe(patchResult.metadata.contentType);

    // Patch
    expect(converter.handle).toHaveBeenCalledTimes(0);
    expect(patcher.handle).toHaveBeenCalledTimes(1);
    expect(patcher.handle).toHaveBeenLastCalledWith(args);
  });

  it('does not convert to a default type if there is none.', async(): Promise<void> => {
    delete args.representation;
    convertingPatcher = new ConvertingPatcher(patcher, converter);
    const result = await convertingPatcher.handle(args);
    expect(result.metadata.contentType).toBe(patchResult.metadata.contentType);

    // Patch
    expect(converter.handle).toHaveBeenCalledTimes(0);
    expect(patcher.handle).toHaveBeenCalledTimes(1);
    expect(patcher.handle).toHaveBeenLastCalledWith(args);
  });
});
