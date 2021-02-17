import { ErrorHandlingWaterfallHandler } from '../../../../src/util/handlers/ErrorHandlingWaterfallHandler';

describe('ErrorHandlingWaterfallHandler', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(ErrorHandlingWaterfallHandler).toBeDefined();
  });
});
