/* eslint-disable tsdoc/syntax */
// tsdoc/syntax cannot handle `@range`
import type { TemplateFunction } from 'ejs';
import { compile, render } from 'ejs';
import type { TemplateEngine, Template } from './TemplateEngine';
import { readTemplate } from './TemplateEngine';
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
    this.applyTemplate = readTemplate(template)
      .then((templateString: string): TemplateFunction => compile(templateString));
  }

  public async render(contents: T): Promise<string>;
  public async render<TCustom = T>(contents: TCustom, template: Template): Promise<string>;
  public async render<TCustom = T>(contents: TCustom, template?: Template): Promise<string> {
    return template ? render(await readTemplate(template), contents) : (await this.applyTemplate)(contents);
  }
}
