import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { getLoggerFor } from '../logging/LogUtil';
import { isError } from '../util/errors/ErrorUtil';
import { guardStream } from '../util/GuardedStream';
import type { HttpHandler } from './HttpHandler';
import { ServerConfigurator } from './ServerConfigurator';

/**
 * A {@link ServerConfigurator} that attaches an {@link HttpHandler} to the `request` event of a {@link Server}.
 * All incoming requests will be sent to the provided handler.
 * Failsafes are added to make sure a valid response is sent in case something goes wrong.
 *
 * The `showStackTrace` parameter can be used to add stack traces to error outputs.
 */
export class HandlerServerConfigurator extends ServerConfigurator {
  protected readonly logger = getLoggerFor(this);
  protected readonly errorLogger = (error: Error): void => {
    this.logger.error(`Request error: ${error.message}`);
  };

  /** The main HttpHandler */
  private readonly handler: HttpHandler;
  private readonly showStackTrace: boolean;

  public constructor(handler: HttpHandler, showStackTrace = false) {
    super();
    this.handler = handler;
    this.showStackTrace = showStackTrace;
  }

  public async handle(server: Server): Promise<void> {
    server.on(
      'request',
      // eslint-disable-next-line ts/no-misused-promises
      async(request: IncomingMessage, response: ServerResponse): Promise<void> => {
        try {
          this.logger.info(`Received ${request.method} request for ${request.url}`);
          const guardedRequest = guardStream(request);
          guardedRequest.on('error', this.errorLogger);
          await this.handler.handleSafe({ request: guardedRequest, response });
        } catch (error: unknown) {
          const errMsg = this.createErrorMessage(error);
          this.logger.error(errMsg);
          if (response.headersSent) {
            response.end();
          } else {
            response.setHeader('Content-Type', 'text/plain; charset=utf-8');
            response.writeHead(500).end(errMsg);
          }
        } finally {
          if (!response.headersSent) {
            response.writeHead(404).end();
          }
        }
      },
    );
  }

  /**
   * Creates a readable error message based on the error and the `showStackTrace` parameter.
   */
  private createErrorMessage(error: unknown): string {
    if (!isError(error)) {
      return `Unknown error: ${error as string}.\n`;
    }
    if (this.showStackTrace && isError(error) && error.stack) {
      return `${error.stack}\n`;
    }
    return `${error.name}: ${error.message}\n`;
  }
}
