import { Representation } from '../../../../src/ldp/representation/Representation';
import { RepresentationPreferences } from '../../../../src/ldp/representation/RepresentationPreferences';
import { ChainedConverter } from '../../../../src/storage/conversion/ChainedConverter';
import { checkRequest } from '../../../../src/storage/conversion/ConversionUtil';
import {
  RepresentationConverter,
  RepresentationConverterArgs,
} from '../../../../src/storage/conversion/RepresentationConverter';

class DummyConverter extends RepresentationConverter {
  private readonly inType: string;
  private readonly outType: string;

  public constructor(inType: string, outType: string) {
    super();
    this.inType = inType;
    this.outType = outType;
  }

  public async canHandle(input: RepresentationConverterArgs): Promise<void> {
    checkRequest(input, [ this.inType ], [ this.outType ]);
  }

  public async handle(input: RepresentationConverterArgs): Promise<Representation> {
    const representation: Representation = { ...input.representation };
    representation.metadata = { ...input.representation.metadata, contentType: this.outType };
    return representation;
  }
}

describe('A ChainedConverter', (): void => {
  let converters: RepresentationConverter[];
  let converter: ChainedConverter;
  let representation: Representation;
  let preferences: RepresentationPreferences;
  let args: RepresentationConverterArgs;

  beforeEach(async(): Promise<void> => {
    converters = [
      new DummyConverter('text/turtle', 'chain/1'),
      new DummyConverter('chain/1', 'chain/2'),
      new DummyConverter('chain/2', 'internal/quads'),
    ];
    converter = new ChainedConverter(converters, [ 'chain/1', 'chain/2' ]);

    representation = { metadata: { contentType: 'text/turtle' } as any } as Representation;
    preferences = { type: [{ value: 'internal/quads', weight: 1 }]};
    args = { representation, preferences, identifier: { path: 'path' }};
  });

  it('needs at least 2 converter and n-1 chains.', async(): Promise<void> => {
    expect((): any => new ChainedConverter([], [])).toThrow('At least 2 converters are required.');
    expect((): any => new ChainedConverter([ converters[0] ], [])).toThrow('At least 2 converters are required.');
    expect((): any => new ChainedConverter([ converters[0], converters[1] ], []))
      .toThrow('1 type is required per converter chain.');
    expect(new ChainedConverter([ converters[0], converters[1] ], [ 'apple' ]))
      .toBeInstanceOf(ChainedConverter);
  });

  it('can handle requests with the correct in- and output.', async(): Promise<void> => {
    await expect(converter.canHandle(args)).resolves.toBeUndefined();
  });

  it('errors if the start of the chain does not support the representation type.', async(): Promise<void> => {
    representation.metadata.contentType = 'bad/type';
    await expect(converter.canHandle(args)).rejects.toThrow();
  });

  it('errors if the end of the chain does not support the preferences.', async(): Promise<void> => {
    delete preferences.type;
    await expect(converter.canHandle(args)).rejects.toThrow();
  });

  it('runs the data through the chain.', async(): Promise<void> => {
    jest.spyOn(converters[0], 'handle');
    jest.spyOn(converters[1], 'handle');
    jest.spyOn(converters[2], 'handle');

    const result = await converter.handle(args);
    expect(result.metadata.contentType).toEqual('internal/quads');
    expect((converters[0] as any).handle).toHaveBeenCalledTimes(1);
    expect((converters[1] as any).handle).toHaveBeenCalledTimes(1);
    expect((converters[2] as any).handle).toHaveBeenCalledTimes(1);
  });
});
