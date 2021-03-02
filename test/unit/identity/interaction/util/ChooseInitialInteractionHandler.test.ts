import {
  ChooseInitialInteractionHandler,
} from '../../../../../src/identity/interaction/util/ChooseInitialInteractionHandler';

describe('ChooseInitialInteractionHandler', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(ChooseInitialInteractionHandler).toBeDefined();
  });
});
