/* eslint-disable tsdoc/syntax */
// tsdoc/syntax can't handle {json} parameter
import type { TemplateDelegate } from 'handlebars';
import { compile } from 'handlebars';
import type { TemplateEngine, Template } from './TemplateEngine';
import { readTemplate } from './TemplateEngine';
import Dict = NodeJS.Dict;

/**
 * Fills in Handlebars templates.
 */
export class HandlebarsTemplateEngine<T extends Dict<any> = Dict<any>> implements TemplateEngine<T> {
  private readonly applyTemplate: Promise<TemplateDelegate>;

  /**
   * @param template - The default template @range {json}
   */
  public constructor(template?: Template) {
    this.applyTemplate = readTemplate(template)
      .then((templateString: string): TemplateDelegate => compile(templateString));
  }

  public async render(contents: T): Promise<string>;
  public async render<TCustom = T>(contents: TCustom, template: Template): Promise<string>;
  public async render<TCustom = T>(contents: TCustom, template?: Template): Promise<string> {
    const applyTemplate = template ? compile(await readTemplate(template)) : await this.applyTemplate;
    return applyTemplate(contents);
  }
}
