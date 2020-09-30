import type { HttpHandler } from '../../src/server/HttpHandler';
import type { ResourceStore } from '../../src/storage/ResourceStore';

export interface ServerConfig {
  store: ResourceStore;
  getHttpHandler: () => HttpHandler;
}
