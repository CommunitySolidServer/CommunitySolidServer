import { StaticInteractionHandler } from '../../../../src/identity/interaction/StaticInteractionHandler';

describe('A FixedInteractionHandler', (): void => {
  const json = { data: 'data' };
  const handler = new StaticInteractionHandler(json);

  it('returns the given JSON as response.', async(): Promise<void> => {
    await expect(handler.handle()).resolves.toEqual({ json });
  });
});
