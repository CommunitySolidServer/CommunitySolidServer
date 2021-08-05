import type { ResponseDescription } from '../../ldp/http/response/ResponseDescription';
import type { ResponseWriter } from '../../ldp/http/ResponseWriter';
import { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import { guardedStreamFrom } from '../../util/StreamUtil';
import type { TemplateEngine } from '../../util/templates/TemplateEngine';
import type { HttpResponse } from '../HttpResponse';
import Dict = NodeJS.Dict;

/**
 * A Render Handler that uses a template engine to render a response.
 */
export class TemplateHandler<T extends Dict<any> = Dict<any>>
  extends AsyncHandler<{ response: HttpResponse; templateFile: string; contents: T }> {
  private readonly responseWriter: ResponseWriter;
  private readonly templateEngine: TemplateEngine;
  private readonly contentType: string;

  public constructor(responseWriter: ResponseWriter, templateEngine: TemplateEngine, contentType = 'text/html') {
    super();
    this.responseWriter = responseWriter;
    this.templateEngine = templateEngine;
    this.contentType = contentType;
  }

  public async handle({ response, templateFile, contents }:
  { response: HttpResponse; templateFile: string; contents: T }): Promise<void> {
    const rendered = await this.templateEngine.render(contents, { templateFile });
    const result: ResponseDescription = {
      statusCode: 200,
      data: guardedStreamFrom(rendered),
      metadata: new RepresentationMetadata(this.contentType),
    };
    await this.responseWriter.handleSafe({ response, result });
  }
}
