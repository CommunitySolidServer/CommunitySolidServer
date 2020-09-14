import { HttpHandler } from '../../src/server/HttpHandler';

export interface ServerConfig {
  getHttpHandler(): HttpHandler;
}
