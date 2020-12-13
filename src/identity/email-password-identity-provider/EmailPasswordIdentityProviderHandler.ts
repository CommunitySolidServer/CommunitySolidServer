import type { IncomingMessage, ServerResponse } from 'http';
import Koa from 'koa';
import { getLoggerFor } from '../../logging/LogUtil';
import { HttpHandler } from '../../server/HttpHandler';
import type { Guarded } from '../../util/GuardedStream';

interface EmailPasswordIdentityProviderHandlerArgs {
  optional?: string;
}

export class EmailPasswordIdentityProviderHandler extends HttpHandler {
  private readonly app: Koa;
  private readonly logger = getLoggerFor(this);

  public constructor(args: EmailPasswordIdentityProviderHandlerArgs) {
    super();
    Object.assign(this, args);
    this.app = new Koa();
    this.app.onerror = (err): void => {
      throw err;
    };
    this.app.use(
      async(ctx, next): Promise<void> => {
        this.logger.info(ctx.url);
        if (ctx.url === '/cool') {
          await new Promise((resolve): void => {
            setTimeout((): void => {
              ctx.body = 'cool dude';
              resolve();
            }, 2000);
          });
        } else {
          return await next();
        }
      },
    );
    this.app.use(
      async(): Promise<void> => {
        throw new Error('oop error');
      },
    );
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
