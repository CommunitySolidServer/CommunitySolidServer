import { BaseTypedRepresentationConverter } from '../../../../src/storage/conversion/BaseTypedRepresentationConverter';
import type { RepresentationConverterArgs } from '../../../../src/storage/conversion/RepresentationConverter';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

class CustomTypedRepresentationConverter extends BaseTypedRepresentationConverter {
  public handle = jest.fn();
}

describe('A BaseTypedRepresentationConverter', (): void => {
  it('accepts strings.', async(): Promise<void> => {
    const converter = new CustomTypedRepresentationConverter('a/b', 'c/d');
    await expect(converter.getOutputTypes('a/b')).resolves.toEqual({
      'c/d': 1,
    });
  });

  it('accepts string arrays.', async(): Promise<void> => {
    const converter = new CustomTypedRepresentationConverter([ 'a/b', 'c/d' ], [ 'e/f', 'g/h' ]);
    const output = { 'e/f': 1, 'g/h': 1 };
    await expect(converter.getOutputTypes('a/b')).resolves.toEqual(output);
    await expect(converter.getOutputTypes('c/d')).resolves.toEqual(output);
  });

  it('accepts records.', async(): Promise<void> => {
    const converter = new CustomTypedRepresentationConverter({ 'a/b': 0.5 }, { 'c/d': 0.5 });
    await expect(converter.getOutputTypes('a/b')).resolves.toEqual({
      'c/d': 0.5 * 0.5,
    });
  });

  it('can not handle input without a Content-Type.', async(): Promise<void> => {
    const args: RepresentationConverterArgs = { representation: { metadata: {}}, preferences: {}} as any;
    const converter = new CustomTypedRepresentationConverter('*/*', 'b/b');
    await expect(converter.canHandle(args)).rejects.toThrow(NotImplementedHttpError);
  });

  it('can not handle a type that does not match the input types.', async(): Promise<void> => {
    const args: RepresentationConverterArgs =
      { representation: { metadata: { contentType: 'b/b' }}, preferences: {}} as any;
    const converter = new CustomTypedRepresentationConverter('a/a', 'b/b');
    await expect(converter.canHandle(args)).rejects.toThrow(NotImplementedHttpError);
  });

  it('can not handle preference that do not match the output types.', async(): Promise<void> => {
    const args: RepresentationConverterArgs =
      { representation: { metadata: { contentType: 'a/a' }}, preferences: { type: { 'c/c': 1 }}} as any;
    const converter = new CustomTypedRepresentationConverter('a/a', { 'c/*': 0, 'd/d': 1 });
    await expect(converter.canHandle(args)).rejects.toThrow(NotImplementedHttpError);
  });

  it('can handle input where the type and preferences match the converter.', async(): Promise<void> => {
    const args: RepresentationConverterArgs =
      { representation: { metadata: { contentType: 'a/a' }}, preferences: { type: { 'c/*': 1 }}} as any;
    const converter = new CustomTypedRepresentationConverter('a/a', { 'c/c': 1, 'd/d': 1 });
    await expect(converter.canHandle(args)).resolves.toBeUndefined();
  });
});
