import type { KeyValueStorage } from '../../../../src/storage/keyvalue/KeyValueStorage';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import type { AsyncHandler } from '../../../../src/util/handlers/AsyncHandler';
import { ConditionalHandler } from '../../../../src/util/handlers/ConditionalHandler';

describe('A ConditionalHandler', (): void => {
  const storageKey = 'completed';
  const storageValue = true;
  const input = 'input';
  let storage: KeyValueStorage<string, unknown>;
  let source: jest.Mocked<AsyncHandler<string, string>>;
  let handler: ConditionalHandler<string, string>;

  beforeEach(async(): Promise<void> => {
    storage = new Map<string, boolean>() as any;
    source = {
      canHandle: jest.fn(),
      handleSafe: jest.fn().mockResolvedValue('handledSafely'),
      handle: jest.fn().mockResolvedValue('handled'),
    };

    handler = new ConditionalHandler(source, storage, storageKey, storageValue);
  });

  it('send canHandle input to the source.', async(): Promise<void> => {
    await expect(handler.canHandle(input)).resolves.toBeUndefined();
    expect(source.canHandle).toHaveBeenCalledTimes(1);
    expect(source.canHandle).toHaveBeenLastCalledWith(input);
  });

  it('rejects all canHandle requests once the storage value matches.', async(): Promise<void> => {
    await storage.set(storageKey, storageValue);
    await expect(handler.canHandle(input)).rejects.toThrow(NotImplementedHttpError);
    expect(source.canHandle).toHaveBeenCalledTimes(0);
  });

  it('caches the value of the storage.', async(): Promise<void> => {
    await storage.set(storageKey, storageValue);
    await expect(handler.canHandle(input)).rejects.toThrow(NotImplementedHttpError);
    await storage.delete(storageKey);
    await expect(handler.canHandle(input)).rejects.toThrow(NotImplementedHttpError);
  });

  it('redirects input to the source handleSafe call.', async(): Promise<void> => {
    await expect(handler.handleSafe(input)).resolves.toBe('handledSafely');
    expect(source.handleSafe).toHaveBeenCalledTimes(1);
    expect(source.handleSafe).toHaveBeenLastCalledWith(input);
    expect(storage.get(storageKey)).toBeUndefined();
  });

  it('can store the value itself if requested after a handleSafe call.', async(): Promise<void> => {
    handler = new ConditionalHandler(source, storage, storageKey, storageValue, true);
    await expect(handler.handleSafe(input)).resolves.toBe('handledSafely');
    expect(source.handleSafe).toHaveBeenCalledTimes(1);
    expect(source.handleSafe).toHaveBeenLastCalledWith(input);
    expect(storage.get(storageKey)).toBe(storageValue);
  });

  it('rejects all handleSafe requests once the storage value matches.', async(): Promise<void> => {
    await storage.set(storageKey, storageValue);
    await expect(handler.handleSafe(input)).rejects.toThrow(NotImplementedHttpError);
    expect(source.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('redirects input to the source handle call.', async(): Promise<void> => {
    await expect(handler.handle(input)).resolves.toBe('handled');
    expect(source.handle).toHaveBeenCalledTimes(1);
    expect(source.handle).toHaveBeenLastCalledWith(input);
    expect(storage.get(storageKey)).toBeUndefined();
  });

  it('does not reject handle requests once the storage value matches.', async(): Promise<void> => {
    await storage.set(storageKey, storageValue);
    await expect(handler.handle(input)).resolves.toBe('handled');
    expect(source.handle).toHaveBeenCalledTimes(1);
    expect(source.handle).toHaveBeenLastCalledWith(input);
  });

  it('can store the value itself if requested after a handle call.', async(): Promise<void> => {
    handler = new ConditionalHandler(source, storage, storageKey, storageValue, true);
    await expect(handler.handle(input)).resolves.toBe('handled');
    expect(source.handle).toHaveBeenCalledTimes(1);
    expect(source.handle).toHaveBeenLastCalledWith(input);
    expect(storage.get(storageKey)).toBe(storageValue);
  });
});
