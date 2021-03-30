import { BaseUrlHandler } from '../../../../../src/pods/generate/variables/BaseUrlHandler';
import { TEMPLATE_VARIABLE } from '../../../../../src/pods/generate/variables/Variables';
import type { PodSettings } from '../../../../../src/pods/settings/PodSettings';

describe('A BaseUrlHandler', (): void => {
  const handler = new BaseUrlHandler();

  it('adds the identifier as base URL variable.', async(): Promise<void> => {
    const identifier = { path: 'http://test.com/foo' };
    const settings = {} as PodSettings;
    await expect(handler.handle({ identifier, settings })).resolves.toBeUndefined();
    expect(settings[TEMPLATE_VARIABLE.baseUrl]).toBe(identifier.path);
  });
});
