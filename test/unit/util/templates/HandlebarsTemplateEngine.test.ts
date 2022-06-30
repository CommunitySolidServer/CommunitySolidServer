import { NotImplementedHttpError } from '../../../../src';
import { HandlebarsTemplateEngine } from '../../../../src/util/templates/HandlebarsTemplateEngine';

jest.mock('../../../../src/util/templates/TemplateUtil', (): any => ({
  getTemplateFilePath: jest.fn((template): string => template),
  readTemplate: jest.fn(async(): Promise<string> => `{{detail}}`),
}));

describe('A HandlebarsTemplateEngine', (): void => {
  const contents = { detail: 'a&b' };
  let templateEngine: HandlebarsTemplateEngine;

  beforeEach((): void => {
    templateEngine = new HandlebarsTemplateEngine('http://localhost:3000/');
  });

  it('uses the passed template.', async(): Promise<void> => {
    await expect(templateEngine.handleSafe({ contents, template: 'someTemplate.hbs' }))
      .resolves.toBe('a&amp;b');
  });

  it('throws an exception for unsupported template files.', async(): Promise<void> => {
    await expect(templateEngine.handleSafe({ contents, template: 'someTemplate.txt' }))
      .rejects.toThrow(NotImplementedHttpError);
  });

  it('throws an exception if no template was passed.', async(): Promise<void> => {
    await expect(templateEngine.handleSafe({ contents }))
      .rejects.toThrow(NotImplementedHttpError);
  });
});
