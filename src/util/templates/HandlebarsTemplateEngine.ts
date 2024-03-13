import { compile } from 'handlebars';
import { ExtensionBasedTemplateEngine } from './ExtensionBasedTemplateEngine';
import type { TemplateEngineInput } from './TemplateEngine';
import { readTemplate } from './TemplateUtil';
import Dict = NodeJS.Dict;

/**
 * Fills in Handlebars templates.
 */
export class HandlebarsTemplateEngine<T extends Dict<unknown> = Dict<unknown>> extends ExtensionBasedTemplateEngine<T> {
  private readonly baseUrl: string;

  /**
   * @param baseUrl - Base URL of the server.
   * @param supportedExtensions - The extensions that are supported by this template engine (defaults to 'hbs').
   */
  public constructor(baseUrl: string, supportedExtensions = [ 'hbs' ]) {
    super(supportedExtensions);
    this.baseUrl = baseUrl;
  }

  public async handle({ contents, template }: TemplateEngineInput<T>): Promise<string> {
    const applyTemplate = compile(await readTemplate(template));
    return applyTemplate({ ...contents, baseUrl: this.baseUrl });
  }
}
