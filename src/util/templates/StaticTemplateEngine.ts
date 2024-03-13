import type { AsyncHandler } from '../handlers/AsyncHandler';
import type { Template, TemplateEngineInput } from './TemplateEngine';
import { TemplateEngine } from './TemplateEngine';
import Dict = NodeJS.Dict;

/**
 * Template engine that renders output based on a static template file.
 */
export class StaticTemplateEngine<T extends Dict<unknown> = Dict<unknown>> extends TemplateEngine<T> {
  private readonly template: Template;
  private readonly templateEngine: AsyncHandler<TemplateEngineInput<T>, string>;

  /**
   * Creates a new StaticTemplateEngine.
   *
   * @param templateEngine - The template engine that should be used for processing the template.
   * @param template - The static template to be used.
   */
  public constructor(templateEngine: AsyncHandler<TemplateEngineInput<T>, string>, template: Template) {
    super();
    this.template = template;
    this.templateEngine = templateEngine;
  }

  public async canHandle({ contents, template }: TemplateEngineInput<T>): Promise<void> {
    if (typeof template !== 'undefined') {
      throw new TypeError('StaticTemplateEngine does not support template as handle input, ' +
        'provide a template via the constructor instead!');
    }
    return this.templateEngine.canHandle({ contents, template: this.template });
  }

  public async handle({ contents }: TemplateEngineInput<T>): Promise<string> {
    return this.templateEngine.handle({ contents, template: this.template });
  }
}
