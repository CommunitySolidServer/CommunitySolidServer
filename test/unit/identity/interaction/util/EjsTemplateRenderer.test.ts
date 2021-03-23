import { renderFile } from 'ejs';
import {
  EjsTemplateRenderer,
} from '../../../../../src/identity/interaction/util/EjsTemplateRenderer';

jest.mock('ejs');

describe('An EjsTemplateRenderer', (): void => {
  const templatePath = '/var/templates/';
  const templateFile = 'template.ejs';
  const options = 'options!';
  const renderer = new EjsTemplateRenderer<string>(templatePath, templateFile);

  it('renders the given file with the given options.', async(): Promise<void> => {
    await expect(renderer.render(options)).resolves.toBeUndefined();
    expect(renderFile).toHaveBeenCalledTimes(1);
    expect(renderFile).toHaveBeenLastCalledWith('/var/templates/template.ejs', options);
  });
});
