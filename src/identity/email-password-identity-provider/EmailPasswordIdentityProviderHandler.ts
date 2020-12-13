import type { IncomingMessage, ServerResponse } from 'http';
import type { Router } from '@bessonovs/node-http-router';
import { getLoggerFor } from '../../logging/LogUtil';
import { HttpHandler } from '../../server/HttpHandler';
import type { Guarded } from '../../util/GuardedStream';
import getRouter from './tempServer';

interface EmailPasswordIdentityProviderHandlerArgs {
  optional?: string;
}

export class EmailPasswordIdentityProviderHandler extends HttpHandler {
  private readonly router: Router;
  private readonly logger = getLoggerFor(this);

  public constructor(args: EmailPasswordIdentityProviderHandlerArgs) {
    super();
    Object.assign(this, args);
    this.router = getRouter();
  }

  public async handle(input: {
    request: Guarded<IncomingMessage>;
    response: ServerResponse;
  }): Promise<void> {
    this.logger.info('Handling');
    await this.router.serve(input.request, input.response);
  }
}
