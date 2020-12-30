import { getLoggerFor } from '../../../logging/LogUtil';
import { HttpHandler } from '../../../server/HttpHandler';
import type { HttpRequest } from '../../../server/HttpRequest';
import type { HttpResponse } from '../../../server/HttpResponse';

export class AbortInteractionHttpHandler extends HttpHandler {
  private readonly logger = getLoggerFor(this);

  // Uncomment
  // public async canHandle(input: {
  //   request: HttpRequest;
  //   response: HttpResponse;
  // }) {

  // }

  public async handle(input: {
    request: HttpRequest;
    response: HttpResponse;
  }): Promise<void> {
    this.logger.info('Abort Interaction');
    this.logger.info(input.request.url ?? 'No Url');
  }
}
