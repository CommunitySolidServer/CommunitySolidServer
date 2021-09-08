/* eslint-disable tsdoc/syntax */
// tsdoc/syntax cannot handle `@range`
import type { TemplateFunction } from 'ejs';
import { compile, render } from 'ejs';
import type { TemplateEngine, Template } from './TemplateEngine';
import { getTemplateFilePath, readTemplate } from './TemplateEngine';
import Dict = NodeJS.Dict;

/**
 * Fills in EJS templates.
 */
export class EjsTemplateEngine<T extends Dict<any> = Dict<any>> implements TemplateEngine<T> {
  private readonly applyTemplate: Promise<TemplateFunction>;

  /**
   * @param template - The default template @range {json}
   */
  public constructor(template?: Template) {
    // EJS requires the `filename` parameter to be able to include partial templates
    const filename = getTemplateFilePath(template);
    this.applyTemplate = readTemplate(template)
      .then((templateString: string): TemplateFunction => compile(templateString, { filename }));
  }

  public async render(contents: T): Promise<string>;
  public async render<TCustom = T>(contents: TCustom, template: Template): Promise<string>;
  public async render<TCustom = T>(contents: TCustom, template?: Template): Promise<string> {
    const options = { ...contents, filename: getTemplateFilePath(template) };
    return template ? render(await readTemplate(template), options) : (await this.applyTemplate)(options);
  }
}
