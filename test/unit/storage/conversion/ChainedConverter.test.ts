import type { Representation } from '../../../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import type {
  RepresentationPreferences,
  ValuePreferences,
} from '../../../../src/http/representation/RepresentationPreferences';
import { BaseTypedRepresentationConverter } from '../../../../src/storage/conversion/BaseTypedRepresentationConverter';
import { ChainedConverter } from '../../../../src/storage/conversion/ChainedConverter';
import { matchesMediaType } from '../../../../src/storage/conversion/ConversionUtil';
import type { RepresentationConverterArgs } from '../../../../src/storage/conversion/RepresentationConverter';
import { CONTENT_TYPE, POSIX } from '../../../../src/util/Vocabularies';

class DummyConverter extends BaseTypedRepresentationConverter {
  private readonly inTypes: ValuePreferences;
  private readonly outTypes: ValuePreferences;

  public constructor(inTypes: ValuePreferences, outTypes: ValuePreferences) {
    super(inTypes, outTypes);
    this.inTypes = inTypes;
    this.outTypes = outTypes;
  }

  public async handle(input: RepresentationConverterArgs): Promise<Representation> {
    // Make sure the input type is supported
    const inType = input.representation.metadata.contentType!;
    if (!Object.entries(this.inTypes).some(([ range, weight ]): boolean =>
      weight > 0 && matchesMediaType(range, inType))) {
      throw new Error(`Unsupported input: ${inType}`);
    }

    // Make sure we're sending preferences that are actually supported
    const outType = Object.keys(input.preferences.type!)[0];
    if (!Object.entries(this.outTypes).some(([ range, weight ]): boolean =>
      weight > 0 && matchesMediaType(range, outType))) {
      throw new Error(`Unsupported output: ${outType}`);
    }
    const metadata = new RepresentationMetadata(
      input.representation.metadata,
      { [CONTENT_TYPE]: outType },
    );
    return { ...input.representation, metadata };
  }
}

describe('A ChainedConverter', (): void => {
  let representation: Representation;
  let preferences: RepresentationPreferences;
  let args: RepresentationConverterArgs;

  beforeEach(async(): Promise<void> => {
    const metadata = new RepresentationMetadata('a/a');
    metadata.set(POSIX.terms.size, '500');
    representation = { metadata } as Representation;
    preferences = { type: { 'x/x': 1, 'x/*': 0.8 }};
    args = { representation, preferences, identifier: { path: 'path' }};
  });

  it('needs at least 1 converter.', async(): Promise<void> => {
    expect((): any => new ChainedConverter([])).toThrow('At least 1 converter is required.');
    expect(new ChainedConverter([ new DummyConverter({}, {}) ])).toBeInstanceOf(ChainedConverter);
  });

  it('errors if there are no content-type or preferences.', async(): Promise<void> => {
    args.representation.metadata.contentType = undefined;
    const converters = [ new DummyConverter({ 'a/a': 1 }, { 'x/x': 1 }) ];
    const converter = new ChainedConverter(converters);
    await expect(converter.canHandle(args)).rejects.toThrow('Missing Content-Type header.');
  });

  it('errors if no path can be found.', async(): Promise<void> => {
    const converters = [ new DummyConverter({ 'a/a': 1 }, { 'x/x': 1 }) ];
    const converter = new ChainedConverter(converters);

    args.representation.metadata.contentType = 'b/b';
    await expect(converter.handle(args)).rejects
      .toThrow('No conversion path could be made from b/b to x/x:1,x/*:0.8,internal/*:0.');
  });

  it('can handle situations where no conversion is required.', async(): Promise<void> => {
    const converters = [ new DummyConverter({ 'b/b': 1 }, { 'x/x': 1 }) ];
    args.representation.metadata.contentType = 'b/b';
    args.preferences.type = { 'b/*': 1, 'x/x': 0.5 };
    const converter = new ChainedConverter(converters);

    const result = await converter.handle(args);
    expect(result.metadata.contentType).toBe('b/b');
    expect(result.metadata.get(POSIX.terms.size)?.value).toBe('500');
  });

  it('converts input matching the output preferences if a better output can be found.', async(): Promise<void> => {
    const converters = [ new DummyConverter({ 'b/b': 1 }, { 'x/x': 1 }) ];
    args.representation.metadata.contentType = 'b/b';
    args.preferences.type = { 'b/*': 0.5, 'x/x': 1 };
    const converter = new ChainedConverter(converters);

    const result = await converter.handle(args);
    expect(result.metadata.contentType).toBe('x/x');
    expect(result.metadata.get(POSIX.terms.size)).toBeUndefined();
  });

  it('interprets no preferences as */*.', async(): Promise<void> => {
    const converters = [ new DummyConverter({ 'a/a': 1 }, { 'x/x': 1 }) ];
    const converter = new ChainedConverter(converters);
    args.representation.metadata.contentType = 'b/b';
    args.preferences.type = undefined;

    let result = await converter.handle(args);
    expect(result.metadata.contentType).toBe('b/b');
    expect(result.metadata.get(POSIX.terms.size)?.value).toBe('500');

    args.preferences.type = {};
    result = await converter.handle(args);
    expect(result.metadata.contentType).toBe('b/b');
    expect(result.metadata.get(POSIX.terms.size)?.value).toBe('500');
  });

  it('can find paths of length 1.', async(): Promise<void> => {
    const converters = [ new DummyConverter({ 'a/a': 1 }, { 'x/x': 1 }) ];
    const converter = new ChainedConverter(converters);

    const result = await converter.handle(args);
    expect(result.metadata.contentType).toBe('x/x');
    expect(result.metadata.get(POSIX.terms.size)).toBeUndefined();
  });

  it('can find longer paths.', async(): Promise<void> => {
    // Path: a/a -> b/b -> c/c -> x/x
    const converters = [
      new DummyConverter({ 'b/b': 0.8, 'b/c': 1 }, { 'c/b': 0.9, 'c/c': 1 }),
      new DummyConverter({ 'a/a': 0.8, 'a/b': 1 }, { 'b/b': 0.9, 'b/a': 0.5 }),
      new DummyConverter({ 'd/d': 0.8, 'c/*': 1 }, { 'x/x': 0.9, 'x/a': 1 }),
    ];
    const converter = new ChainedConverter(converters);

    const result = await converter.handle(args);
    expect(result.metadata.contentType).toBe('x/x');
    expect(result.metadata.get(POSIX.terms.size)).toBeUndefined();
  });

  it('will use the shortest path among the best found.', async(): Promise<void> => {
    // Valid paths: 0 -> 1 -> 2, 3 -> 2, 4 -> 2, 5 -> 2, *6 -> 2*
    const converters = [
      new DummyConverter({ 'a/a': 1 }, { 'b/b': 1 }),
      new DummyConverter({ 'b/b': 1 }, { 'c/c': 1 }),
      new DummyConverter({ 'c/c': 1 }, { 'x/x': 1 }),
      new DummyConverter({ '*/*': 0.5 }, { 'c/c': 1 }),
      new DummyConverter({ 'a/a': 0.8 }, { 'c/c': 1 }),
      new DummyConverter({ 'a/*': 1 }, { 'c/c': 0.5 }),
      new DummyConverter({ 'a/a': 1 }, { 'c/c': 1 }),
    ];
    const converter = new ChainedConverter(converters);

    // Only the best converters should have been called (6 and 2)
    for (const dummyConverter of converters) {
      jest.spyOn(dummyConverter, 'handle');
    }
    const result = await converter.handle(args);
    expect(result.metadata.contentType).toBe('x/x');
    expect(result.metadata.get(POSIX.terms.size)).toBeUndefined();
    expect(converters[0].handle).toHaveBeenCalledTimes(0);
    expect(converters[1].handle).toHaveBeenCalledTimes(0);
    expect(converters[2].handle).toHaveBeenCalledTimes(1);
    expect(converters[3].handle).toHaveBeenCalledTimes(0);
    expect(converters[4].handle).toHaveBeenCalledTimes(0);
    expect(converters[5].handle).toHaveBeenCalledTimes(0);
    expect(converters[6].handle).toHaveBeenCalledTimes(1);
  });

  it('will use the intermediate content-types with the best weight.', async(): Promise<void> => {
    const converters = [
      new DummyConverter({ 'a/a': 1 }, { 'b/b': 0.8, 'c/c': 0.6 }),
      new DummyConverter({ 'b/b': 0.1, 'c/*': 0.9 }, { 'd/d': 1, 'e/e': 0.8 }),
      new DummyConverter({ 'd/*': 0.9, 'e/*': 0.1 }, { 'x/x': 1 }),
    ];
    const converter = new ChainedConverter(converters);

    const spy0 = jest.spyOn(converters[0], 'handle');
    const spy1 = jest.spyOn(converters[1], 'handle');
    const result = await converter.handle(args);
    expect(result.metadata.contentType).toBe('x/x');
    let { metadata } = await spy0.mock.results[0].value;
    expect(metadata.contentType).toBe('c/c');
    ({ metadata } = await spy1.mock.results[0].value);
    expect(metadata.contentType).toBe('d/d');
  });

  it('will continue if an even better path can be found by adding a converter.', async(): Promise<void> => {
    // Path: a/a -> x/a -> x/x
    const converters = [
      new DummyConverter({ 'a/a': 1 }, { 'x/a': 0.9 }),
      new DummyConverter({ 'x/a': 1 }, { 'x/x': 1 }),
    ];
    const converter = new ChainedConverter(converters);

    const result = await converter.handle(args);
    expect(result.metadata.contentType).toBe('x/x');
  });

  it('will continue if an even better path can be found through another path.', async(): Promise<void> => {
    // Path: a/a -> b/b -> x/x
    const converters = [
      new DummyConverter({ 'a/a': 1 }, { 'x/a': 0.5 }),
      new DummyConverter({ 'a/a': 1 }, { 'b/b': 1 }),
      new DummyConverter({ 'b/b': 1 }, { 'x/x': 0.6 }),
    ];
    const converter = new ChainedConverter(converters);

    const result = await converter.handle(args);
    expect(result.metadata.contentType).toBe('x/x');
  });

  it('will stop if all future paths are worse.', async(): Promise<void> => {
    // Path: a/a -> x/a
    const converters = [
      new DummyConverter({ 'a/a': 1 }, { 'x/a': 1 }),
      new DummyConverter({ 'x/a': 1 }, { 'x/x': 0.1 }),
    ];
    const converter = new ChainedConverter(converters);

    const result = await converter.handle(args);
    expect(result.metadata.contentType).toBe('x/a');
  });

  it('calls handle when calling handleSafe.', async(): Promise<void> => {
    const converters = [ new DummyConverter({ 'a/a': 1 }, { 'x/x': 1 }) ];
    const converter = new ChainedConverter(converters);
    jest.spyOn(converter, 'handle');

    await converter.handleSafe(args);
    expect(converter.handle).toHaveBeenCalledTimes(1);
    expect(converter.handle).toHaveBeenLastCalledWith(args);
  });

  it('does not get stuck in infinite conversion loops.', async(): Promise<void> => {
    const converters = [
      new DummyConverter({ 'a/a': 1 }, { 'b/b': 1 }),
      new DummyConverter({ 'b/b': 1 }, { 'a/a': 1 }),
    ];
    const converter = new ChainedConverter(converters);

    await expect(converter.handle(args)).rejects
      .toThrow('No conversion path could be made from a/a to x/x:1,x/*:0.8,internal/*:0.');
  });
});
