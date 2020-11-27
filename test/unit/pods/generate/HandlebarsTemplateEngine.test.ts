import { HandlebarsTemplateEngine } from '../../../../src/pods/generate/HandlebarsTemplateEngine';

describe('A HandlebarsTemplateEngine', (): void => {
  const engine = new HandlebarsTemplateEngine();

  it('fills in Handlebars templates.', async(): Promise<void> => {
    const template = '<{{webId}}> a <http://xmlns.com/foaf/0.1/Person>.';
    const options = { webId: 'http://alice/#profile' };
    expect(engine.apply(template, options)).toBe('<http://alice/#profile> a <http://xmlns.com/foaf/0.1/Person>.');
  });
});
