import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import type { AsyncHandler } from '../../../../src/util/handlers/AsyncHandler';
import { BooleanAndHandler } from '../../../../src/util/handlers/BooleanAndHandler';
import { StaticAsyncHandler } from '../../../util/StaticAsyncHandler';

describe('A BooleanAndHandler', (): void => {
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

  it('can handle the input if all of its handlers can.', async(): Promise<void> => {
    const handler = new BooleanAndHandler([ handlerTrue, handlerError ]);
    await expect(handler.canHandle(null)).resolves.toBeUndefined();
  });

  it('errors if some of its handlers do not supports the input.', async(): Promise<void> => {
    const handler = new BooleanAndHandler([ handlerTrue, handlerCanNotHandle ]);
    await expect(handler.canHandle(null)).rejects.toThrow('Not all handlers support this input.');
  });

  it('returns true if all of its handlers returns true.', async(): Promise<void> => {
    const handler = new BooleanAndHandler([ handlerTrue, handlerTrue ]);
    await expect(handler.handle(null)).resolves.toBe(true);
  });

  it('returns false if some of its handlers returns false.', async(): Promise<void> => {
    const handler = new BooleanAndHandler([ handlerTrue, handlerFalse ]);
    await expect(handler.handle(null)).resolves.toBe(false);
  });

  it('throw an internal error when calling handle with unsupported input.', async(): Promise<void> => {
    const handler = new BooleanAndHandler([ handlerCanNotHandle ]);
    await expect(handler.handle(null)).rejects.toThrow(InternalServerError);
  });

  it('returns the same handle results with handleSafe.', async(): Promise<void> => {
    const handler = new BooleanAndHandler([ handlerTrue, handlerTrue ]);
    await expect(handler.handleSafe(null)).resolves.toBe(true);
  });

  it('throws the canHandle error when calling handleSafe with unsupported input.', async(): Promise<void> => {
    const handler = new BooleanAndHandler([ handlerTrue, handlerCanNotHandle ]);
    await expect(handler.handleSafe(null)).rejects.toThrow('Not all handlers support this input.');
  });
});
