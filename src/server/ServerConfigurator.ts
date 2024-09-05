import type { Server } from 'node:http';
import { AsyncHandler } from 'asynchronous-handlers';

/**
 * Configures a {@link Server} by attaching listeners for specific events.
 */
export abstract class ServerConfigurator extends AsyncHandler<Server> {}
