import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { RegexRouterRule } from '../../../../src/storage/routing/RegexRouterRule';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';

describe('A RegexRouterRule', (): void => {
  const base = 'http://test.com/';
  const store: ResourceStore = 'resourceStore' as any;

  it('rejects identifiers not containing the base.', async(): Promise<void> => {
    const router = new RegexRouterRule(base, {});
    await expect(router.canHandle({ identifier: { path: 'http://notTest.com/apple' }}))
      .rejects.toThrow(new BadRequestHttpError(`Identifiers need to start with http://test.com`));
  });

  it('rejects identifiers not matching any regex.', async(): Promise<void> => {
    const router = new RegexRouterRule(base, { pear: store });
    await expect(router.canHandle({ identifier: { path: `${base}apple/` }}))
      .rejects.toThrow(new BadRequestHttpError(`No stored regexes match http://test.com/apple/`));
  });

  it('accepts identifiers matching any regex.', async(): Promise<void> => {
    const router = new RegexRouterRule(base, { '^/apple': store });
    await expect(router.canHandle({ identifier: { path: `${base}apple/` }}))
      .resolves.toBeUndefined();
  });

  it('returns the corresponding store.', async(): Promise<void> => {
    const store2: ResourceStore = 'resourceStore2' as any;
    const router = new RegexRouterRule(base, { '^/apple': store2, '/pear/': store });
    await expect(router.handle({ identifier: { path: `${base}apple/` }})).resolves.toBe(store2);
  });
});
