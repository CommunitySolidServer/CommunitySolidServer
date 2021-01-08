import { TypedRepresentationConverter } from '../../../../src/storage/conversion/TypedRepresentationConverter';

class CustomTypedRepresentationConverter extends TypedRepresentationConverter {
  public handle = jest.fn();
}

describe('A TypedRepresentationConverter', (): void => {
  it('defaults to allowing everything.', async(): Promise<void> => {
    const converter = new CustomTypedRepresentationConverter();
    await expect(converter.getInputTypes()).resolves.toEqual({
    });
    await expect(converter.getOutputTypes()).resolves.toEqual({
    });
  });

  it('accepts strings.', async(): Promise<void> => {
    const converter = new CustomTypedRepresentationConverter('a/b', 'c/d');
    await expect(converter.getInputTypes()).resolves.toEqual({
      'a/b': 1,
    });
    await expect(converter.getOutputTypes()).resolves.toEqual({
      'c/d': 1,
    });
  });

  it('accepts string arrays.', async(): Promise<void> => {
    const converter = new CustomTypedRepresentationConverter([ 'a/b', 'c/d' ], [ 'e/f', 'g/h' ]);
    await expect(converter.getInputTypes()).resolves.toEqual({
      'a/b': 1,
      'c/d': 1,
    });
    await expect(converter.getOutputTypes()).resolves.toEqual({
      'e/f': 1,
      'g/h': 1,
    });
  });

  it('accepts records.', async(): Promise<void> => {
    const converter = new CustomTypedRepresentationConverter({ 'a/b': 0.5 }, { 'c/d': 0.5 });
    await expect(converter.getInputTypes()).resolves.toEqual({
      'a/b': 0.5,
    });
    await expect(converter.getOutputTypes()).resolves.toEqual({
      'c/d': 0.5,
    });
  });
});
