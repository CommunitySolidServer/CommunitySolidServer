import {
  OidcInteractionCompleter,
} from '../../../../../src/identity/interaction/util/OidcInteractionCompleter';

describe('OidcInteractionCompleter', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(OidcInteractionCompleter).toBeDefined();
  });
});
