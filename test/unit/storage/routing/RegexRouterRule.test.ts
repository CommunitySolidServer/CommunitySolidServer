import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { RegexRouterRule, RegexRule } from '../../../../src/storage/routing/RegexRouterRule';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('A RegexRouterRule', (): void => {
  const base = 'http://test.com/';
  const store: ResourceStore = 'resourceStore' as any;

  it('can construct a RegexRule utility object.', (): void => {
    const regex = '/myPath/';
    const rule = new RegexRule(regex, store);
    expect(rule.regex).toEqual(new RegExp(regex, 'u'));
    expect(rule.store).toEqual(store);
  });

  it('rejects identifiers not containing the base.', async(): Promise<void> => {
    const router = new RegexRouterRule(base, []);
    const result = router.canHandle({ identifier: { path: 'http://notTest.com/apple' }});
    await expect(result).rejects.toThrow(BadRequestHttpError);
    await expect(result).rejects.toThrow('Identifiers need to start with http://test.com');
  });

  it('rejects identifiers not matching any regex.', async(): Promise<void> => {
    const router = new RegexRouterRule(base, [ new RegexRule('pear', store) ]);
    const result = router.canHandle({ identifier: { path: `${base}apple/` }});
    await expect(result).rejects.toThrow(NotImplementedHttpError);
    await expect(result).rejects.toThrow('No stored regexes match http://test.com/apple/');
  });

  it('accepts identifiers matching any regex.', async(): Promise<void> => {
    const router = new RegexRouterRule(base, [ new RegexRule('^/apple', store) ]);
    await expect(router.canHandle({ identifier: { path: `${base}apple/` }}))
      .resolves.toBeUndefined();
  });

  it('returns the corresponding store.', async(): Promise<void> => {
    const store2: ResourceStore = 'resourceStore2' as any;
    const router = new RegexRouterRule(base, [ new RegexRule('^/apple', store2), new RegexRule('/pear/', store) ]);
    await expect(router.handle({ identifier: { path: `${base}apple/` }})).resolves.toBe(store2);
  });
});
