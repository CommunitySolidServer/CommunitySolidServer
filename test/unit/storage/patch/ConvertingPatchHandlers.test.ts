import type { Patch } from '../../../../src/ldp/http/Patch';
import { BasicRepresentation } from '../../../../src/ldp/representation/BasicRepresentation';
import type { Representation } from '../../../../src/ldp/representation/Representation';
import type { ResourceIdentifier } from '../../../../src/ldp/representation/ResourceIdentifier';
import type {
  RepresentationConverter,
  RepresentationConverterArgs,
} from '../../../../src/storage/conversion/RepresentationConverter';
import { ConvertingPatchHandler } from '../../../../src/storage/patch/ConvertingPatchHandler';
import type { PatchHandlerArgs } from '../../../../src/storage/patch/PatchHandler';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';

class SimpleConvertingPatchHandler extends ConvertingPatchHandler {
  private readonly type: string;

  public constructor(converter: RepresentationConverter, intermediateType: string, defaultType: string) {
    super(converter, intermediateType, defaultType);
    this.type = intermediateType;
  }

  public async patch(input: PatchHandlerArgs, representation?: Representation): Promise<Representation> {
    return representation ?
      new BasicRepresentation('patched', representation.metadata) :
      new BasicRepresentation('patched', input.identifier, this.type);
  }
}

describe('A ConvertingPatchHandler', (): void => {
  const intermediateType = 'internal/quads';
  const defaultType = 'text/turtle';
  const identifier: ResourceIdentifier = { path: 'http://test.com/foo' };
  const patch: Patch = new BasicRepresentation([], 'type/patch');
  const representation: Representation = new BasicRepresentation([], 'application/trig');
  let source: jest.Mocked<ResourceStore>;
  let args: PatchHandlerArgs;
  let converter: jest.Mocked<RepresentationConverter>;
  let handler: jest.Mocked<SimpleConvertingPatchHandler>;

  beforeEach(async(): Promise<void> => {
    converter = {
      handleSafe: jest.fn(async({ preferences }: RepresentationConverterArgs): Promise<any> =>
        new BasicRepresentation('converted', Object.keys(preferences.type!)[0])),
    } as any;

    source = {
      getRepresentation: jest.fn().mockResolvedValue(representation),
      setRepresentation: jest.fn(async(id: ResourceIdentifier): Promise<ResourceIdentifier[]> => [ id ]),
    } as any;

    args = { patch, identifier, source };

    handler = new SimpleConvertingPatchHandler(converter, intermediateType, defaultType) as any;
    jest.spyOn(handler, 'patch');
  });

  it('converts the representation before calling the patch function.', async(): Promise<void> => {
    await expect(handler.handle(args)).resolves.toEqual([ identifier ]);

    // Convert input
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(source.getRepresentation).toHaveBeenLastCalledWith(identifier, { });
    expect(converter.handleSafe).toHaveBeenCalledTimes(2);
    expect(converter.handleSafe).toHaveBeenCalledWith({
      representation: await source.getRepresentation.mock.results[0].value,
      identifier,
      preferences: { type: { [intermediateType]: 1 }},
    });

    // Patch
    expect(handler.patch).toHaveBeenCalledTimes(1);
    expect(handler.patch).toHaveBeenLastCalledWith(args, await converter.handleSafe.mock.results[0].value);

    // Convert back
    expect(converter.handleSafe).toHaveBeenLastCalledWith({
      representation: await handler.patch.mock.results[0].value,
      identifier,
      preferences: { type: { 'application/trig': 1 }},
    });
    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
    expect(source.setRepresentation)
      .toHaveBeenLastCalledWith(identifier, await converter.handleSafe.mock.results[1].value);
    expect(source.setRepresentation.mock.calls[0][1].metadata.contentType).toBe(representation.metadata.contentType);
  });

  it('expects the patch function to create a new representation if there is none.', async(): Promise<void> => {
    source.getRepresentation.mockRejectedValueOnce(new NotFoundHttpError());

    await expect(handler.handle(args)).resolves.toEqual([ identifier ]);

    // Try to get input
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(source.getRepresentation).toHaveBeenLastCalledWith(identifier, { });

    // Patch
    expect(handler.patch).toHaveBeenCalledTimes(1);
    expect(handler.patch).toHaveBeenLastCalledWith(args, undefined);

    // Convert new Representation to default type
    expect(converter.handleSafe).toHaveBeenCalledTimes(1);
    expect(converter.handleSafe).toHaveBeenLastCalledWith({
      representation: await handler.patch.mock.results[0].value,
      identifier,
      preferences: { type: { [defaultType]: 1 }},
    });
    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
    expect(source.setRepresentation)
      .toHaveBeenLastCalledWith(identifier, await converter.handleSafe.mock.results[0].value);
    expect(source.setRepresentation.mock.calls[0][1].metadata.contentType).toBe(defaultType);
  });

  it('rethrows the error if something goes wrong getting the representation.', async(): Promise<void> => {
    const error = new Error('bad data');
    source.getRepresentation.mockRejectedValueOnce(error);

    await expect(handler.handle(args)).rejects.toThrow(error);
  });
});
