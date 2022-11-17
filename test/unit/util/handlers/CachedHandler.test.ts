import type { AsyncHandler } from '../../../../src/util/handlers/AsyncHandler';
import {
  CachedHandler,
} from '../../../../src/util/handlers/CachedHandler';

describe('A CachedHandler', (): void => {
  const input: any = { field1: { key: 'value' }, field2: { key: 'value' }, field3: { key: 'value2' }};
  const output = 'response';
  let source: jest.Mocked<AsyncHandler<any, string>>;
  let handler: CachedHandler<any, string>;

  beforeEach(async(): Promise<void> => {
    source = {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue(output),
    } as any;
    handler = new CachedHandler(source);
  });

  it('can handle input if its source can.', async(): Promise<void> => {
    await expect(handler.canHandle(input)).resolves.toBeUndefined();
    expect(source.canHandle).toHaveBeenCalledTimes(1);
    source.canHandle.mockRejectedValue(new Error('bad input'));
    await expect(handler.canHandle(input)).rejects.toThrow('bad input');
    expect(source.canHandle).toHaveBeenCalledTimes(2);
  });

  it('returns the source result.', async(): Promise<void> => {
    await expect(handler.handle(input)).resolves.toBe(output);
    expect(source.handle).toHaveBeenCalledTimes(1);
    expect(source.handle).toHaveBeenLastCalledWith(input);
  });

  it('caches the result.', async(): Promise<void> => {
    await expect(handler.handle(input)).resolves.toBe(output);
    await expect(handler.handle(input)).resolves.toBe(output);
    expect(source.handle).toHaveBeenCalledTimes(1);
  });

  it('caches on the object itself.', async(): Promise<void> => {
    const copy = { ...input };
    await expect(handler.handle(input)).resolves.toBe(output);
    await expect(handler.handle(copy)).resolves.toBe(output);
    expect(source.handle).toHaveBeenCalledTimes(2);
  });

  it('can handle the input if it has a cached result.', async(): Promise<void> => {
    await expect(handler.handle(input)).resolves.toBe(output);
    source.canHandle.mockRejectedValue(new Error('bad input'));
    await expect(handler.canHandle(input)).resolves.toBeUndefined();
    expect(source.canHandle).toHaveBeenCalledTimes(0);
  });

  it('cannot handle input with multiple keys if the first key is already missing.', async(): Promise<void> => {
    handler = new CachedHandler(source, [ 'field1', 'field3' ]);

    await expect(handler.canHandle(input)).resolves.toBeUndefined();
    expect(source.canHandle).toHaveBeenCalledTimes(1);
  });

  it('can use a specific field of the input as key.', async(): Promise<void> => {
    handler = new CachedHandler(source, [ 'field1' ]);

    const copy = { ...input };
    await expect(handler.handle(input)).resolves.toBe(output);
    await expect(handler.handle(copy)).resolves.toBe(output);
    expect(source.handle).toHaveBeenCalledTimes(1);
  });

  it('can use multiple fields of the object as keys.', async(): Promise<void> => {
    handler = new CachedHandler(source, [ 'field1', 'field3' ]);

    const copy = { ...input };
    copy.field2 = { other: 'field' };
    await expect(handler.handle(input)).resolves.toBe(output);
    await expect(handler.handle(copy)).resolves.toBe(output);
    expect(source.handle).toHaveBeenCalledTimes(1);
  });

  it('rejects empty field arrays.', async(): Promise<void> => {
    expect((): any => new CachedHandler(source, []))
      .toThrow('The fields parameter needs to have at least 1 entry if defined.');
  });
});
