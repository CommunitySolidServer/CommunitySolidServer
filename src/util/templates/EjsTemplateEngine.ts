import { render } from 'ejs';
import { ExtensionBasedTemplateEngine } from './ExtensionBasedTemplateEngine';
import type { TemplateEngineInput } from './TemplateEngine';
import { getTemplateFilePath, readTemplate } from './TemplateUtil';
import Dict = NodeJS.Dict;

/**
 * Fills in EJS templates.
 */
export class EjsTemplateEngine<T extends Dict<unknown> = Dict<unknown>> extends ExtensionBasedTemplateEngine<T> {
  private readonly baseUrl: string;

  /**
   * @param baseUrl - Base URL of the server.
   * @param supportedExtensions - The extensions that are supported by this template engine (defaults to 'ejs').
   */
  public constructor(baseUrl: string, supportedExtensions = [ 'ejs' ]) {
    super(supportedExtensions);
    this.baseUrl = baseUrl;
  }

  public async handle({ contents, template }: TemplateEngineInput<T>): Promise<string> {
    const options = { ...contents, filename: getTemplateFilePath(template), baseUrl: this.baseUrl };
    return render(await readTemplate(template), options);
  }
}
