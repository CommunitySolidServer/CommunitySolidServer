import path from 'path';
import { renderFile } from 'ejs';
import type { HttpResponse } from '../HttpResponse';
import { RenderHandler } from './RenderHandler';

export class RenderEjsHandler<
  T extends Record<string, unknown>
> extends RenderHandler<T> {
  private readonly ejsTemplatesDirectory: string;

  public constructor(ejsTemplatesDirectory: string) {
    super();
    this.ejsTemplatesDirectory = ejsTemplatesDirectory;
  }

  public async handle(input: { response: HttpResponse; props: T; viewName: string }): Promise<void> {
    const { viewName, props, response } = input;
    const renderedHtml = await renderFile(path.join(this.ejsTemplatesDirectory, `${viewName}.ejs`), props);
    // Content-Type must not be cammel case
    // eslint-disable-next-line @typescript-eslint/naming-convention
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end(renderedHtml);
  }
}
