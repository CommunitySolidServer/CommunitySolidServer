import type { AsyncHandler } from '../../../../src';
import { BadRequestHttpError } from '../../../../src';
import { ErrorHandlingWaterfallHandler } from '../../../../src/util/handlers/ErrorHandlingWaterfallHandler';
import type { OnErrorHandler } from '../../../../src/util/handlers/OnErrorHandler';
import { StaticAsyncHandler } from '../../../util/StaticAsyncHandler';
import { StaticOnErrorHandler } from '../../../util/StaticOnErrorHandler';

describe('ErrorHandlingWaterfallHandler', (): void => {
  describe('with no handlers', (): void => {
    let onErrorHandler: OnErrorHandler<any, any>;

    beforeEach(
      async(): Promise<void> => {
        onErrorHandler = new StaticOnErrorHandler(true);
      },
    );

    it('can never handle data.', async(): Promise<void> => {
      const handler = new ErrorHandlingWaterfallHandler([], onErrorHandler);

      await expect(handler.canHandle(null)).rejects.toThrow(BadRequestHttpError);
    });

    it('errors if its handle function is called.', async(): Promise<void> => {
      const handler = new ErrorHandlingWaterfallHandler([], onErrorHandler);

      const result = await handler.handle(null);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('All handlers failed');
    });
  });

  describe('with multiple handlers', (): void => {
    let handlerTrue: AsyncHandler<any, any>;
    let handlerFalse: AsyncHandler<any, any>;
    let onErrorHandler: OnErrorHandler<any, any>;
    let canHandleFn: jest.Mock<Promise<void>, [any]>;
    let handleFn: jest.Mock<Promise<void>, [any]>;

    beforeEach(
      async(): Promise<void> => {
        handlerTrue = new StaticAsyncHandler(true, null);
        handlerFalse = new StaticAsyncHandler(false, null);
        onErrorHandler = new StaticOnErrorHandler(true);

        canHandleFn = jest.fn(async(input: any): Promise<any> => input);
        handleFn = jest.fn(async(input: any): Promise<any> => input);
        handlerTrue.canHandle = canHandleFn;
        handlerTrue.handle = handleFn;
      },
    );

    it('can handle data if a handler supports it.', async(): Promise<void> => {
      const handler = new ErrorHandlingWaterfallHandler(
        [ handlerFalse, handlerTrue ],
        onErrorHandler,
      );

      await expect(handler.canHandle(null)).resolves.toBeUndefined();
    });

    it('throws and error if no handler supports it.', async(): Promise<void> => {
      const handler = new ErrorHandlingWaterfallHandler(
        [ handlerFalse, handlerFalse ],
        onErrorHandler,
      );

      await expect(handler.canHandle(null)).rejects.toThrow('[Not supported, Not supported]');
    });

    it('throws an error if no Error objects are thrown.', async(): Promise<void> => {
      handlerFalse.canHandle = async(): Promise<void> => {
        throw 'apple';
      };
      const handler = new ErrorHandlingWaterfallHandler([ handlerFalse, handlerFalse ], onErrorHandler);

      await expect(handler.canHandle(null)).rejects.toThrow('[Unknown error, Unknown error]');
    });

    it('handles data if a handler supports it.', async(): Promise<void> => {
      const handler = new ErrorHandlingWaterfallHandler(
        [ handlerFalse, handlerTrue ],
        onErrorHandler,
      );

      await expect(handler.handle('test')).resolves.toEqual('test');
      expect(canHandleFn).toHaveBeenCalledTimes(1);
      expect(handleFn).toHaveBeenCalledTimes(1);
    });

    it('uses the OnErrorHandler if the handle function is called but no handler supports the data.',
      async(): Promise<void> => {
        const handler = new ErrorHandlingWaterfallHandler(
          [ handlerFalse, handlerFalse ],
          onErrorHandler,
        );

        const result = await handler.handle(null);
        expect(result).toBeInstanceOf(Error);
        expect(result.message).toBe('All handlers failed');
      });

    it('only calls the canHandle function once of its handlers when handleSafe is called.', async(): Promise<void> => {
      const handler = new ErrorHandlingWaterfallHandler([ handlerFalse, handlerTrue ], onErrorHandler);

      await expect(handler.handleSafe('test')).resolves.toEqual('test');
      expect(canHandleFn).toHaveBeenCalledTimes(1);
      expect(handleFn).toHaveBeenCalledTimes(1);
    });

    it('throws the canHandle error when calling handleSafe if the data is not supported.', async(): Promise<void> => {
      const handler = new ErrorHandlingWaterfallHandler([ handlerFalse, handlerFalse ], onErrorHandler);

      await expect(handler.handleSafe(null)).rejects.toThrow('[Not supported, Not supported]');
    });
  });
});
