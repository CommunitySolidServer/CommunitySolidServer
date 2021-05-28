import { promises as fs } from 'fs';
import type { Server } from 'http';
import { joinFilePath } from '../../src/';
import type { Initializer } from '../../src/';
import type { HttpServerFactory } from '../../src/server/HttpServerFactory';
import { putResource } from '../util/FetchUtil';
import { describeIf, getPort } from '../util/Util';
import { getPresetConfigPath, getTestConfigPath, instantiateFromConfig } from './Config';

const port = getPort('SparqlStorage');
const baseUrl = `http://localhost:${port}/`;

describeIf('docker', 'A server with a SPARQL endpoint as storage', (): void => {
  let server: Server;
  let initializer: Initializer;
  let factory: HttpServerFactory;

  beforeAll(async(): Promise<void> => {
    const variables: Record<string, any> = {
      'urn:solid-server:default:variable:baseUrl': baseUrl,
      'urn:solid-server:default:variable:sparqlEndpoint': 'http://localhost:4000/sparql',
    };

    // Create and initialize the server
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      [
        getPresetConfigPath('storage/resource-store/sparql.json'),
        getTestConfigPath('ldp-with-auth.json'),
      ],
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
