import path from 'path';
import { renderFile } from 'ejs';
import type { HttpResponse } from '../HttpResponse';
import { RenderHandler } from './RenderHandler';

export class RenderEjsHandler<T> extends RenderHandler<T> {
  private readonly ejsTemplatePath: string;
  private readonly viewsFolder: string;

  public constructor(viewsFolder: string, ejsTemplatePath: string) {
    super();
    this.viewsFolder = viewsFolder;
    this.ejsTemplatePath = ejsTemplatePath;
  }

  public async handle(input: {
    response: HttpResponse;
    props: T;
  }): Promise<void> {
    const { props, response } = input;
    console.log(this.ejsTemplatePath);
    console.log(this.viewsFolder);
    const renderedHtml = await renderFile(
      path.join(
        this.viewsFolder,
        this.ejsTemplatePath,
      ),
      props,
    );
    // Content-Type must not be cammel case
    // eslint-disable-next-line @typescript-eslint/naming-convention
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end(renderedHtml);
  }
}
