import { promises as fs } from 'fs';
import type { Server } from 'http';
import { joinFilePath } from '../../src/';
import type { Initializer, ResourceStore } from '../../src/';
import type { HttpServerFactory } from '../../src/server/HttpServerFactory';
import { putResource } from '../util/FetchUtil';
import { describeIf, getPort } from '../util/Util';
import { instantiateFromConfig } from './Config';

const port = getPort('SparqlStorage');
const baseUrl = `http://localhost:${port}/`;

describeIf('docker', 'A server with a SPARQL endpoint as storage', (): void => {
  let server: Server;
  let initializer: Initializer;
  let factory: HttpServerFactory;

  beforeAll(async(): Promise<void> => {
    const variables: Record<string, any> = {
      'urn:solid-server:default:variable:port': port,
      'urn:solid-server:default:variable:baseUrl': baseUrl,
      'urn:solid-server:default:variable:sparqlEndpoint': 'http://localhost:4000/sparql',
    };
    const internalStore = await instantiateFromConfig(
      'urn:solid-server:default:SparqlResourceStore',
      'ldp-with-auth.json',
      variables,
    ) as ResourceStore;
    variables['urn:solid-server:default:variable:store'] = internalStore;

    // Create and initialize the server
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      'ldp-with-auth.json',
      variables,
    ) as Record<string, any>;
    ({ factory, initializer } = instances);

    await initializer.handleSafe();
    server = factory.startServer(port);
  });

  afterAll(async(): Promise<void> => {
    await new Promise((resolve, reject): void => {
      server.close((error): void => error ? reject(error) : resolve());
    });
  });

  it('can add a Turtle file to the store.', async(): Promise<void> => {
    // PUT
    const documentUrl = `${baseUrl}person`;
    const body = (await fs.readFile(joinFilePath(__dirname, '../assets/person.ttl'))).toString('utf-8');
    const response = await putResource(documentUrl, { contentType: 'text/turtle', body });
    expect(response).toBeTruthy();
  });
});
