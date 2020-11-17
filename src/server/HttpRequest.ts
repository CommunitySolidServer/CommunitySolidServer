import type { IncomingMessage } from 'http';
import type { Guarded } from '../util/GuardedStream';

/**
 * An incoming HTTP request;
 */
export type HttpRequest = Guarded<IncomingMessage>;
