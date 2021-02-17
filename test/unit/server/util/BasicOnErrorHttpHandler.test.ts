import { BasicOnErrorHttpHandler } from '../../../../src/server/util/BasicOnErrorHttpHandler';

describe('BasicOnErrorHttpHandler', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(BasicOnErrorHttpHandler).toBeDefined();
  });
});
