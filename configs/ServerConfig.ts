import { ExpressHttpServer } from '..';
import { HttpHandler } from '../src/server/HttpHandler';

export interface ServerConfig {
  base: string;
  getHttpServer(): Promise<ExpressHttpServer>;
  getHandler(): HttpHandler;
}
