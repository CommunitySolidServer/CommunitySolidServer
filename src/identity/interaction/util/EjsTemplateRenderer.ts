import path from 'path';
import { renderFile } from 'ejs';
import { TemplateRenderer } from './TemplateRenderer';

export class EjsTemplateRenderer<T> extends TemplateRenderer<T> {
  private readonly ejsTemplatePath: string;
  private readonly viewsFolder: string;

  public constructor(viewsFolder: string, ejsTemplatePath: string) {
    super();
    this.viewsFolder = viewsFolder;
    this.ejsTemplatePath = ejsTemplatePath;
  }

  public async render(options: T): Promise<string> {
    return renderFile(
      path.join(
        this.viewsFolder,
        this.ejsTemplatePath,
      ),
      options,
    );
  }
}
