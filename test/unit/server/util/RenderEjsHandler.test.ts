import { RenderEjsHandler } from '../../../../src/server/util/RenderEjsHandler';

describe('RenderEjsHandler', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(RenderEjsHandler).toBeDefined();
  });
});
