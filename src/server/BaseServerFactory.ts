import { readFileSync } from 'fs';
import type { Server } from 'http';
import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
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

  public constructor(configurator: ServerConfigurator, options: BaseServerFactoryOptions = { https: false }) {
    this.configurator = configurator;
    this.options = { ...options };
  }

  /**
   * Creates an HTTP(S) server.
   */
  public async createServer(): Promise<Server> {
    const createServer = this.options.https ? createHttpsServer : createHttpServer;
    const options = this.createServerOptions();

    const server = createServer(options);

    await this.configurator.handleSafe(server);

    return server;
  }

  private createServerOptions(): BaseServerFactoryOptions {
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
