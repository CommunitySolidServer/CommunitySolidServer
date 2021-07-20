import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import type { TemplateEngine } from '../../util/templates/TemplateEngine';
import type { HttpResponse } from '../HttpResponse';
import Dict = NodeJS.Dict;

/**
 * A Render Handler that uses a template engine to render a response.
 */
export class TemplateHandler<T extends Dict<any> = Dict<any>>
  extends AsyncHandler<{ response: HttpResponse; contents: T }> {
  private readonly templateEngine: TemplateEngine;
  private readonly contentType: string;

  public constructor(templateEngine: TemplateEngine, contentType = 'text/html') {
    super();
    this.templateEngine = templateEngine;
    this.contentType = contentType;
  }

  public async handle({ response, contents }: { response: HttpResponse; contents: T }): Promise<void> {
    const rendered = await this.templateEngine.render(contents);
    // eslint-disable-next-line @typescript-eslint/naming-convention
    response.writeHead(200, { 'Content-Type': this.contentType });
    response.end(rendered);
  }
}
