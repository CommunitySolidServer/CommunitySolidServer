import { ArgExtractor } from '../../../../../src/init/variables/computers/ArgExtractor';

describe('An ArgExtractor', (): void => {
  const key = 'test';
  let extractor: ArgExtractor;

  beforeEach(async(): Promise<void> => {
    extractor = new ArgExtractor(key);
  });

  it('extracts the value.', async(): Promise<void> => {
    await expect(extractor.handle({ test: 'data', notTest: 'notData' })).resolves.toEqual('data');
  });

  it('defaults to a given value if none is defined.', async(): Promise<void> => {
    extractor = new ArgExtractor(key, 'defaultData');
    await expect(extractor.handle({ notTest: 'notData' })).resolves.toEqual('defaultData');
  });
});
