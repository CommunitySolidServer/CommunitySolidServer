import type { AsyncHandler } from 'asynchronous-handlers';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { ForbiddenHttpError } from '../../../../src/util/errors/ForbiddenHttpError';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import { MethodNotAllowedHttpError } from '../../../../src/util/errors/MethodNotAllowedHttpError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { StatusHandler } from '../../../../src/util/handlers/StatusHandler';
import { getError } from '../../../util/Util';

describe('A StatusHandler', (): void => {
  it('converts non-HttpErrors to an HttpError.', async(): Promise<void> => {
    const handler: AsyncHandler<string> = {
      canHandle: jest.fn().mockRejectedValue(new Error('canHandle')),
      handle: jest.fn().mockRejectedValue(new Error('handle')),
      handleSafe: jest.fn().mockRejectedValue(new Error('handleSafe')),
    };
    const statusHandler = new StatusHandler(handler);

    const canHandleError = await getError(async(): Promise<void> => statusHandler.canHandle('input'));
    expect(InternalServerError.isInstance(canHandleError)).toBe(true);
    expect(canHandleError.message).toBe('canHandle');

    const handleError = await getError(async(): Promise<void> => statusHandler.handle('input'));
    expect(InternalServerError.isInstance(handleError)).toBe(true);
    expect(handleError.message).toBe('handle');

    const handleSafeError = await getError(async(): Promise<void> => statusHandler.handleSafe('input'));
    expect(InternalServerError.isInstance(handleSafeError)).toBe(true);
    expect(handleSafeError.message).toBe('handleSafe');
  });

  it('converts AggregateErrors to HttpErrors.', async(): Promise<void> => {
    const handler: AsyncHandler<string> = {
      canHandle: jest.fn().mockRejectedValue(new MethodNotAllowedHttpError()),
      handle: jest.fn().mockRejectedValue(new AggregateError([
        new MethodNotAllowedHttpError(),
        new ForbiddenHttpError(),
      ], 'error')),
      handleSafe: jest.fn().mockRejectedValue(new AggregateError([
        new MethodNotAllowedHttpError(),
        new NotImplementedHttpError(),
      ], 'error')),
    };
    const statusHandler = new StatusHandler(handler);

    await expect(statusHandler.canHandle('input')).rejects.toThrow(MethodNotAllowedHttpError);
    await expect(statusHandler.handle('input')).rejects.toThrow(BadRequestHttpError);
    await expect(statusHandler.handleSafe('input')).rejects.toThrow(InternalServerError);
  });
});
