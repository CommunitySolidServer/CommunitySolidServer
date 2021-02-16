import {
  EjsTemplateRenderer,
} from '../../../../../src/identity/interaction/util/EjsTemplateRenderer';

describe('EjsTemplateRenderer', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(EjsTemplateRenderer).toBeDefined();
  });
});
