import type { AsyncHandler } from '../../../../src/util/handlers/AsyncHandler';
import { filterHandlers, findHandler } from '../../../../src/util/handlers/HandlerUtil';
import { StaticAsyncHandler } from '../../../util/StaticAsyncHandler';

describe('HandlerUtil', (): void => {
  describe('findHandler', (): void => {
    let handlerTrue: AsyncHandler<any, any>;
    let handlerFalse: AsyncHandler<any, any>;

    beforeEach(async(): Promise<void> => {
      handlerTrue = new StaticAsyncHandler(true, null);
      handlerFalse = new StaticAsyncHandler(false, null);
    });

    it('finds a matching handler.', async(): Promise<void> => {
      await expect(findHandler([ handlerFalse, handlerTrue ], null)).resolves.toBe(handlerTrue);
    });

    it('errors if there is no matching handler.', async(): Promise<void> => {
      await expect(findHandler([ handlerFalse, handlerFalse ], null)).rejects.toThrow('Not supported, Not supported');
    });

    it('supports non-native Errors.', async(): Promise<void> => {
      jest.spyOn(handlerFalse, 'canHandle').mockRejectedValue('apple');
      await expect(findHandler([ handlerFalse ], null)).rejects.toThrow('Unknown error: apple');
    });
  });

  describe('filterHandlers', (): void => {
    let handlerTrue: AsyncHandler<any, any>;
    let handlerFalse: AsyncHandler<any, any>;

    beforeEach(async(): Promise<void> => {
      handlerTrue = new StaticAsyncHandler(true, null);
      handlerFalse = new StaticAsyncHandler(false, null);
    });

    it('finds matching handlers.', async(): Promise<void> => {
      await expect(filterHandlers([ handlerTrue, handlerFalse, handlerTrue ], null))
        .resolves.toEqual([ handlerTrue, handlerTrue ]);
    });

    it('errors if there is no matching handler.', async(): Promise<void> => {
      await expect(filterHandlers([ handlerFalse, handlerFalse ], null))
        .rejects.toThrow('Not supported, Not supported');
    });
  });
});
