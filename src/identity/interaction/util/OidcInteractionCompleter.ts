import { getLoggerFor } from '../../../logging/LogUtil';
import type { HttpResponse } from '../../../server/HttpResponse';
import { AsyncHandler } from '../../../util/AsyncHandler';

export interface OidcInteractionCompleterInput {
  webId: string;
  response: HttpResponse;
}

export class OidcInteractionCompleter extends AsyncHandler<OidcInteractionCompleterInput> {
  private readonly logger = getLoggerFor(this);

  public async handle(input: OidcInteractionCompleterInput): Promise<void> {
    this.logger.verbose('OidcInteractionCompleter');
    input.response.end('OidcInteractionCompleter');
  }
}
