import { readFileSync } from 'node:fs';
import type { Server } from 'node:http';
import { createServer as createHttpServer } from 'node:http';
import type { ServerOptions } from 'node:https';
import { createServer as createHttpsServer } from 'node:https';
import { getLoggerFor } from '../logging/LogUtil';
import type { HttpServerFactory } from './HttpServerFactory';
import type { ServerConfigurator } from './ServerConfigurator';

/**
 * Options to be used when creating the server.
 * Due to Components.js not supporting external types, this has been simplified (for now?).
 * The common https keys here (key/cert/pfx) will be interpreted as file paths that need to be read
 * before passing the options to the `createServer` function.
 */
export interface BaseServerFactoryOptions {
  /**
   * If the server should start as an HTTP or HTTPS server.
   */
  https?: boolean;

  key?: string;
  cert?: string;

  pfx?: string;
  passphrase?: string;
}

/**
 * Creates an HTTP(S) server native Node.js `http`/`https` modules.
 *
 * Will apply a {@link ServerConfigurator} to the server,
 * which should be used to attach listeners.
 */
export class BaseServerFactory implements HttpServerFactory {
  protected readonly logger = getLoggerFor(this);

  private readonly configurator: ServerConfigurator;
  private readonly options: BaseServerFactoryOptions;

  public constructor(configurator: ServerConfigurator, options?: BaseServerFactoryOptions) {
    this.configurator = configurator;
    this.options = { https: false, ...options };
  }

  /**
   * Creates an HTTP(S) server.
   */
  public async createServer(): Promise<Server> {
    const options = this.createServerOptions();

    const server = this.options.https ? createHttpsServer(options) : createHttpServer(options);

    await this.configurator.handleSafe(server);

    return server;
  }

  private createServerOptions(): ServerOptions {
    const options = { ...this.options };
    for (const id of [ 'key', 'cert', 'pfx' ] as const) {
      const val = options[id];
      if (val) {
        options[id] = readFileSync(val, 'utf8');
      }
    }
    return options;
  }
}
