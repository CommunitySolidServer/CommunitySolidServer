import { GetPostRouterHandler } from '../../../../src/server/util/GetPostRouterHandler';

describe('GetPostRouterHandler', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(GetPostRouterHandler).toBeDefined();
  });
});
