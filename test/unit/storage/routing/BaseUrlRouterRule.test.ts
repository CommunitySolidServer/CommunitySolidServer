import type { KeyValueStorage } from '../../../../src/storage/keyvalue/KeyValueStorage';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { BaseUrlRouterRule } from '../../../../src/storage/routing/BaseUrlRouterRule';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';

describe('A BaseUrlRouterRule', (): void => {
  let stores: KeyValueStorage<string, ResourceStore>;
  const baseStore = 'baseStore!' as any;
  const aliceIdentifier = { path: 'http://alice.test.com/' };
  const aliceStore = 'aliceStore!' as any;
  let rule: BaseUrlRouterRule;

  beforeEach(async(): Promise<void> => {
    stores = new Map([[ aliceIdentifier.path, aliceStore ]]) as any;

    rule = new BaseUrlRouterRule(stores, baseStore);
  });

  it('returns the matching store if the request contains the correct identifier.', async(): Promise<void> => {
    await expect(rule.handle({ identifier: { path: 'http://alice.test.com/foo' }})).resolves.toEqual(aliceStore);
  });

  it('returns the base store if there is no matching identifier.', async(): Promise<void> => {
    await expect(rule.handle({ identifier: { path: 'http://bob.test.com/foo' }})).resolves.toEqual(baseStore);
  });

  it('errors if there is no match and no base store.', async(): Promise<void> => {
    rule = new BaseUrlRouterRule(stores);
    await expect(rule.handle({ identifier: { path: 'http://bob.test.com/foo' }})).rejects.toThrow(NotFoundHttpError);
  });
});
