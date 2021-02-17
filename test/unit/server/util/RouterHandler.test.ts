import { RouterHandler } from '../../../../src/server/util/RouterHandler';

describe('RouterHandler', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(RouterHandler).toBeDefined();
  });
});
