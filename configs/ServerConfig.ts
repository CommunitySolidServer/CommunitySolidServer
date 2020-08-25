import { ExpressHttpServer } from '..';

export interface ServerConfig {
  base: string;
  port: number;
  getHttpServer(): Promise<ExpressHttpServer>;
}
