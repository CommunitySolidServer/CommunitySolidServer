import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import type { AsyncHandler } from '../../../../src/util/handlers/AsyncHandler';
import { BooleanHandler } from '../../../../src/util/handlers/BooleanHandler';
import { StaticAsyncHandler } from '../../../util/StaticAsyncHandler';

describe('A BooleanHandler', (): void => {
  let handlerFalse: AsyncHandler<any, false>;
  let handlerTrue: AsyncHandler<any, true>;
  let handlerError: AsyncHandler<any, never>;
  let handlerCanNotHandle: AsyncHandler<any, any>;

  beforeEach(async(): Promise<void> => {
    handlerFalse = new StaticAsyncHandler(true, false);
    handlerTrue = new StaticAsyncHandler(true, true);
    handlerError = new StaticAsyncHandler(true, null) as any;
    handlerError.handle = (): never => {
      throw new InternalServerError();
    };
    handlerCanNotHandle = new StaticAsyncHandler(false, null);
  });

  it('can handle the input if any of its handlers can.', async(): Promise<void> => {
    const handler = new BooleanHandler([ handlerFalse, handlerCanNotHandle ]);
    await expect(handler.canHandle(null)).resolves.toBeUndefined();
  });

  it('errors if none of its handlers supports the input.', async(): Promise<void> => {
    const handler = new BooleanHandler([ handlerCanNotHandle, handlerCanNotHandle ]);
    await expect(handler.canHandle(null)).rejects.toThrow('Not supported, Not supported');
  });

  it('returns true if any of its handlers returns true.', async(): Promise<void> => {
    const handler = new BooleanHandler([ handlerFalse, handlerTrue, handlerCanNotHandle ]);
    await expect(handler.handle(null)).resolves.toBe(true);
  });

  it('returns false if none of its handlers returns true.', async(): Promise<void> => {
    const handler = new BooleanHandler([ handlerFalse, handlerError, handlerCanNotHandle ]);
    await expect(handler.handle(null)).resolves.toBe(false);
  });

  it('throw an internal error when calling handle with unsupported input.', async(): Promise<void> => {
    const handler = new BooleanHandler([ handlerCanNotHandle, handlerCanNotHandle ]);
    await expect(handler.handle(null)).rejects.toThrow(InternalServerError);
  });

  it('returns the same handle results with handleSafe.', async(): Promise<void> => {
    const handler = new BooleanHandler([ handlerFalse, handlerTrue, handlerCanNotHandle ]);
    await expect(handler.handleSafe(null)).resolves.toBe(true);
  });

  it('throws the canHandle error when calling handleSafe with unsupported input.', async(): Promise<void> => {
    const handler = new BooleanHandler([ handlerCanNotHandle, handlerCanNotHandle ]);
    await expect(handler.handleSafe(null)).rejects.toThrow('Not supported, Not supported');
  });
});
