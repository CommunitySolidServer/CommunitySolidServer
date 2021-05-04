import { renderFile } from 'ejs';
import { joinFilePath } from '../../util/PathUtil';
import type { HttpResponse } from '../HttpResponse';
import { RenderHandler } from './RenderHandler';

/**
 * A Render Handler that uses EJS templates to render a response.
 */
export class RenderEjsHandler<T> extends RenderHandler<T> {
  private readonly templatePath: string;
  private readonly templateFile: string;

  public constructor(templatePath: string, templateFile: string) {
    super();
    this.templatePath = templatePath;
    this.templateFile = templateFile;
  }

  public async handle(input: { response: HttpResponse; props: T }): Promise<void> {
    const { props, response } = input;
    const renderedHtml = await renderFile(joinFilePath(this.templatePath, this.templateFile), props || {});
    // eslint-disable-next-line @typescript-eslint/naming-convention
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end(renderedHtml);
  }
}
