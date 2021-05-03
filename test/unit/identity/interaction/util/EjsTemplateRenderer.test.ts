import { renderFile } from 'ejs';
import {
  EjsTemplateRenderer,
} from '../../../../../src/identity/interaction/util/EjsTemplateRenderer';

jest.mock('ejs');

describe('An EjsTemplateRenderer', (): void => {
  const templatePath = '/var/templates/';
  const templateFile = 'template.ejs';
  const options: Record<string, string> = { email: 'alice@test.email', webId: 'http://alice.test.com/card#me' };
  const renderer = new EjsTemplateRenderer<Record<string, string>>(templatePath, templateFile);

  it('renders the given file with the given options.', async(): Promise<void> => {
    await expect(renderer.handle(options)).resolves.toBeUndefined();
    expect(renderFile).toHaveBeenCalledTimes(1);
    expect(renderFile).toHaveBeenLastCalledWith('/var/templates/template.ejs', options);
  });
});
