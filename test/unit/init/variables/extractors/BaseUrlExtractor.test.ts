import { BaseUrlExtractor } from '../../../../../src/init/variables/extractors/BaseUrlExtractor';

describe('A BaseUrlExtractor', (): void => {
  let computer: BaseUrlExtractor;

  beforeEach(async(): Promise<void> => {
    computer = new BaseUrlExtractor();
  });

  it('extracts the baseUrl parameter.', async(): Promise<void> => {
    await expect(computer.handle({ baseUrl: 'http://example.com/', port: 3333 }))
      .resolves.toBe('http://example.com/');
  });

  it('uses the port parameter if baseUrl is not defined.', async(): Promise<void> => {
    await expect(computer.handle({ port: 3333 })).resolves.toBe('http://localhost:3333/');
  });

  it('defaults to port 3000.', async(): Promise<void> => {
    await expect(computer.handle({})).resolves.toBe('http://localhost:3000/');
  });
});
