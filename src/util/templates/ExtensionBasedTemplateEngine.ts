import { NotImplementedHttpError } from '../errors/NotImplementedHttpError';
import { getExtension } from '../PathUtil';
import type { TemplateEngineInput } from './TemplateEngine';
import { TemplateEngine } from './TemplateEngine';
import { getTemplateFilePath } from './TemplateUtil';
import Dict = NodeJS.Dict;

/**
 * Parent class for template engines that accept handling based on whether the template extension is supported.
 */
export abstract class ExtensionBasedTemplateEngine<T extends Dict<unknown> = Dict<unknown>> extends TemplateEngine<T> {
  protected readonly supportedExtensions: string[];

  /**
   * Constructor for ExtensionBasedTemplateEngine.
   *
   * @param supportedExtensions - Array of the extensions supported by the template engine (e.g. [ 'ejs' ]).
   */
  protected constructor(supportedExtensions: string[]) {
    super();
    this.supportedExtensions = supportedExtensions;
  }

  public async canHandle({ template }: TemplateEngineInput<T>): Promise<void> {
    if (typeof template === 'undefined') {
      throw new NotImplementedHttpError('No template was provided.');
    }
    // Check if the target template extension is supported.
    const filepath = getTemplateFilePath(template);
    if (typeof filepath === 'undefined' || !this.supportedExtensions.includes(getExtension(filepath))) {
      throw new NotImplementedHttpError('The provided template is not supported.');
    }
  }
}
