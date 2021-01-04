import type { Representation } from '../../../../src/ldp/representation/Representation';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';
import type {
  ValuePreferences,
  RepresentationPreferences,
} from '../../../../src/ldp/representation/RepresentationPreferences';
import { ChainedConverter } from '../../../../src/storage/conversion/ChainedConverter';
import type { RepresentationConverterArgs } from '../../../../src/storage/conversion/RepresentationConverter';
import { TypedRepresentationConverter } from '../../../../src/storage/conversion/TypedRepresentationConverter';
import { CONTENT_TYPE } from '../../../../src/util/Vocabularies';

class DummyConverter extends TypedRepresentationConverter {
  private readonly inTypes: ValuePreferences;
  private readonly outTypes: ValuePreferences;

  public constructor(inTypes: ValuePreferences, outTypes: ValuePreferences) {
    super();
    this.inTypes = inTypes;
    this.outTypes = outTypes;
  }

  public async getInputTypes(): Promise<ValuePreferences> {
    return this.inTypes;
  }

  public async getOutputTypes(): Promise<ValuePreferences> {
    return this.outTypes;
  }

  public async handle(input: RepresentationConverterArgs): Promise<Representation> {
    const metadata = new RepresentationMetadata(input.representation.metadata,
      { [CONTENT_TYPE]: Object.keys(input.preferences.type!)[0] });
    return { ...input.representation, metadata };
  }
}

describe('A ChainedConverter', (): void => {
  let converters: TypedRepresentationConverter[];
  let converter: ChainedConverter;
  let representation: Representation;
  let preferences: RepresentationPreferences;
  let args: RepresentationConverterArgs;

  beforeEach(async(): Promise<void> => {
    converters = [
      new DummyConverter({ 'text/turtle': 1 }, { 'chain/1': 0.9, 'chain/x': 0.5 }),
      new DummyConverter({ 'chain/*': 1, 'chain/x': 0.5 }, { 'chain/2': 1 }),
      new DummyConverter({ 'chain/2': 1 }, { 'internal/quads': 1 }),
    ];
    converter = new ChainedConverter(converters);

    const metadata = new RepresentationMetadata({ [CONTENT_TYPE]: 'text/turtle' });
    representation = { metadata } as Representation;
    preferences = { type: { 'internal/quads': 1 }};
    args = { representation, preferences, identifier: { path: 'path' }};
  });

  it('needs at least 2 converters.', async(): Promise<void> => {
    expect((): any => new ChainedConverter([])).toThrow('At least 2 converters are required.');
    expect((): any => new ChainedConverter([ converters[0] ])).toThrow('At least 2 converters are required.');
    expect(new ChainedConverter([ converters[0], converters[1] ]))
      .toBeInstanceOf(ChainedConverter);
  });

  it('supports the same inputs as the first converter of the chain.', async(): Promise<void> => {
    await expect(converter.getInputTypes()).resolves.toEqual(await converters[0].getInputTypes());
  });

  it('supports the same outputs as the last converter of the chain.', async(): Promise<void> => {
    await expect(converter.getOutputTypes()).resolves.toEqual(await converters[2].getOutputTypes());
  });

  it('can handle requests with the correct in- and output.', async(): Promise<void> => {
    await expect(converter.canHandle(args)).resolves.toBeUndefined();
  });

  it('errors if the start of the chain does not support the representation type.', async(): Promise<void> => {
    representation.metadata.contentType = 'bad/type';
    await expect(converter.canHandle(args)).rejects.toThrow();
  });

  it('errors if the end of the chain does not support the preferences.', async(): Promise<void> => {
    preferences.type = { 'abc/def': 1 };
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

  it('errors if there is no valid chain at runtime.', async(): Promise<void> => {
    converters = [
      new DummyConverter({ 'text/turtle': 1 }, { 'chain/1': 0.9, 'chain/x': 0.5 }),
      new DummyConverter({ 'chain/2': 1 }, { 'internal/quads': 1 }),
    ];
    converter = new ChainedConverter(converters);
    await expect(converter.handle(args)).rejects.toThrow();
  });
});
