import { PassthroughConverter } from '../../../../src/storage/conversion/PassthroughConverter';

describe('A PassthroughConverter', (): void => {
  const representation = {};
  const args = { representation } as any;

  const converter = new PassthroughConverter();

  it('supports any conversion.', async(): Promise<void> => {
    await expect(converter.canHandle(args)).resolves.toBeUndefined();
  });

  it('returns the original representation on handle.', async(): Promise<void> => {
    await expect(converter.handle(args)).resolves.toBe(representation);
  });

  it('returns the original representation on handleSafe.', async(): Promise<void> => {
    await expect(converter.handleSafe(args)).resolves.toBe(representation);
  });
});
