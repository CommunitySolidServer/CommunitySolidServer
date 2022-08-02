import { HandlebarsTemplateEngine } from '../../../../src/util/templates/HandlebarsTemplateEngine';

jest.mock('../../../../src/util/templates/TemplateEngine', (): any => ({
  readTemplate: jest.fn(async({ templateString }): Promise<string> => `${templateString}: {{detail}}`),
}));

describe('A HandlebarsTemplateEngine', (): void => {
  const template = { templateString: 'xyz' };
  const contents = { detail: 'a&b' };
  let templateEngine: HandlebarsTemplateEngine;

  beforeEach((): void => {
    templateEngine = new HandlebarsTemplateEngine('http://localhost:3000/', template);
  });

  it('uses the default template when no template was passed.', async(): Promise<void> => {
    await expect(templateEngine.render(contents)).resolves.toBe('xyz: a&amp;b');
  });

  it('uses the passed template.', async(): Promise<void> => {
    await expect(templateEngine.render(contents, { templateString: 'my' })).resolves.toBe('my: a&amp;b');
  });
});
