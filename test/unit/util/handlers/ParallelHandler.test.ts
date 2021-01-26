import type { AsyncHandler } from '../../../../src/util/handlers/AsyncHandler';
import { ParallelHandler } from '../../../../src/util/handlers/ParallelHandler';

describe('A ParallelHandler', (): void => {
  const handlers: jest.Mocked<AsyncHandler<string, string>>[] = [
    {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue('0'),
    },
    {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue('1'),
    },
    {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue('2'),
    },
  ] as any;
  const composite: ParallelHandler<string, string> = new ParallelHandler<string, string>(handlers);

  afterEach(jest.clearAllMocks);

  describe('canHandle', (): void => {
    it('succeeds if all handlers succeed.', async(): Promise<void> => {
      await expect(composite.canHandle('abc')).resolves.toBeUndefined();

      expect(handlers[0].canHandle).toHaveBeenCalledTimes(1);
      expect(handlers[1].canHandle).toHaveBeenCalledTimes(1);
      expect(handlers[2].canHandle).toHaveBeenCalledTimes(1);

      expect(handlers[0].canHandle).toHaveBeenCalledWith('abc');
      expect(handlers[1].canHandle).toHaveBeenCalledWith('abc');
      expect(handlers[2].canHandle).toHaveBeenCalledWith('abc');
    });

    it('fails if one handler fails.', async(): Promise<void> => {
      const error = new Error('failure');
      handlers[1].canHandle.mockRejectedValueOnce(error);
      await expect(composite.canHandle('abc')).rejects.toThrow(error);
    });
  });

  describe('handle', (): void => {
    it('succeeds if all handlers succeed.', async(): Promise<void> => {
      await expect(composite.handle('abc')).resolves.toEqual([ '0', '1', '2' ]);

      expect(handlers[0].handle).toHaveBeenCalledTimes(1);
      expect(handlers[1].handle).toHaveBeenCalledTimes(1);
      expect(handlers[2].handle).toHaveBeenCalledTimes(1);

      expect(handlers[0].handle).toHaveBeenCalledWith('abc');
      expect(handlers[1].handle).toHaveBeenCalledWith('abc');
      expect(handlers[2].handle).toHaveBeenCalledWith('abc');
    });

    it('fails if one handler fails.', async(): Promise<void> => {
      const error = new Error('failure');
      handlers[1].handle.mockRejectedValueOnce(error);
      await expect(composite.handle('abc')).rejects.toThrow(error);
    });
  });

  describe('handleSafe', (): void => {
    it('succeeds if all handlers succeed.', async(): Promise<void> => {
      await expect(composite.handleSafe('abc')).resolves.toEqual([ '0', '1', '2' ]);

      expect(handlers[0].canHandle).toHaveBeenCalledTimes(1);
      expect(handlers[1].canHandle).toHaveBeenCalledTimes(1);
      expect(handlers[2].canHandle).toHaveBeenCalledTimes(1);

      expect(handlers[0].canHandle).toHaveBeenCalledWith('abc');
      expect(handlers[1].canHandle).toHaveBeenCalledWith('abc');
      expect(handlers[2].canHandle).toHaveBeenCalledWith('abc');

      expect(handlers[0].handle).toHaveBeenCalledTimes(1);
      expect(handlers[1].handle).toHaveBeenCalledTimes(1);
      expect(handlers[2].handle).toHaveBeenCalledTimes(1);

      expect(handlers[0].handle).toHaveBeenCalledWith('abc');
      expect(handlers[1].handle).toHaveBeenCalledWith('abc');
      expect(handlers[2].handle).toHaveBeenCalledWith('abc');
    });

    it('fails if one canHandle fails.', async(): Promise<void> => {
      const error = new Error('failure');
      handlers[1].canHandle.mockRejectedValueOnce(error);
      await expect(composite.handleSafe('abc')).rejects.toThrow(error);

      expect(handlers[0].handle).toHaveBeenCalledTimes(0);
      expect(handlers[1].handle).toHaveBeenCalledTimes(0);
      expect(handlers[2].handle).toHaveBeenCalledTimes(0);
    });

    it('fails if one handle fails.', async(): Promise<void> => {
      const error = new Error('failure');
      handlers[1].handle.mockRejectedValueOnce(error);
      await expect(composite.handleSafe('abc')).rejects.toThrow(error);
    });
  });
});
