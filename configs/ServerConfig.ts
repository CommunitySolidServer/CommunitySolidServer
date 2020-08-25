import { ExpressHttpServer } from '..';

export interface ServerConfig {
  base: string;
  port: Number;
  getHttpServer(): Promise<ExpressHttpServer>;
}
