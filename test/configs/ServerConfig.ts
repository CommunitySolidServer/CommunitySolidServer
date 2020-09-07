import { HttpHandler } from '../../src/server/HttpHandler';

export interface ServerConfig {
  getHandler(): HttpHandler;
}
