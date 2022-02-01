import { KeyExtractor } from '../../../../../src/init/variables/extractors/KeyExtractor';

describe('An KeyExtractor', (): void => {
  const key = 'test';
  let extractor: KeyExtractor;

  beforeEach(async(): Promise<void> => {
    extractor = new KeyExtractor(key);
  });

  it('extracts the value.', async(): Promise<void> => {
    await expect(extractor.handle({ test: 'data', notTest: 'notData' })).resolves.toBe('data');
  });

  it('defaults to a given value if none is defined.', async(): Promise<void> => {
    extractor = new KeyExtractor(key, 'defaultData');
    await expect(extractor.handle({ notTest: 'notData' })).resolves.toBe('defaultData');
  });
});
