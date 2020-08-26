import { ExpressHttpServer } from '..';

export interface ServerConfig {
  base: string;
  getHttpServer(): Promise<ExpressHttpServer>;
}
