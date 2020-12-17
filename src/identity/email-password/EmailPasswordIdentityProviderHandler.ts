import type { IncomingMessage, ServerResponse } from 'http';
import type Koa from 'koa';
import { getLoggerFor } from '../../logging/LogUtil';
import { HttpHandler } from '../../server/HttpHandler';
import type { Guarded } from '../../util/GuardedStream';
import getApp from './tempServer';

interface EmailPasswordIdentityProviderHandlerArgs {
  optional?: string;
}

export class EmailPasswordIdentityProviderHandler extends HttpHandler {
  private readonly app: Koa;
  private readonly logger = getLoggerFor(this);

  public constructor(args: EmailPasswordIdentityProviderHandlerArgs) {
    super();
    Object.assign(this, args);
    this.app = getApp();
    // TODO [>1.0.0] Reenable error passthrough
    // this.app.onerror = (err): void => {
    //   throw err;
    // };
  }

  public async handle(input: {
    request: Guarded<IncomingMessage>;
    response: ServerResponse;
  }): Promise<void> {
    this.logger.info('Handling');
    const callbackPromise = (this.app.callback()(
      input.request,
      input.response,
    ) as unknown) as Promise<void>;
    await callbackPromise;
  }
}
