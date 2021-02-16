import path from 'path';
import { renderFile } from 'ejs';
import { TemplateRenderer } from './TemplateRenderer';

/**
 * Renders options using a given EJS template location and
 * returns the result as a string. This is good for rendering
 * emails.
 */
export class EjsTemplateRenderer<T> extends TemplateRenderer<T> {
  private readonly templatePath: string;
  private readonly templateFile: string;

  public constructor(templatePath: string, templateFile: string) {
    super();
    this.templatePath = templatePath;
    this.templateFile = templateFile;
  }

  public async render(options: T): Promise<string> {
    return renderFile(
      path.join(
        this.templatePath,
        this.templateFile,
      ),
      options,
    );
  }
}
