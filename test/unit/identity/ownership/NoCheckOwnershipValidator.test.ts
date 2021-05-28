import { NoCheckOwnershipValidator } from '../../../../src/identity/ownership/NoCheckOwnershipValidator';

describe('A NoCheckOwnershipValidator', (): void => {
  const validator = new NoCheckOwnershipValidator();

  it('can handle everything.', async(): Promise<void> => {
    await expect(validator.canHandle({ webId: 'http://test.com/alice/#me' })).resolves.toBeUndefined();
  });

  it('believes everything.', async(): Promise<void> => {
    await expect(validator.handle({ webId: 'http://test.com/alice/#me' })).resolves.toBeUndefined();
  });
});
