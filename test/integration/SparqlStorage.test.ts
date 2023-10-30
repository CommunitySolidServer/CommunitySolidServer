import { promises as fs } from 'node:fs';
import { joinFilePath } from '../../src/';
import type { App } from '../../src/';
import { putResource } from '../util/FetchUtil';
import { describeIf, getPort } from '../util/Util';
import { getDefaultVariables, getPresetConfigPath, getTestConfigPath, instantiateFromConfig } from './Config';

const port = getPort('SparqlStorage');
const baseUrl = `http://localhost:${port}/`;

/* eslint-disable jest/require-top-level-describe, jest/consistent-test-it */
describeIf('docker')('A server with a SPARQL endpoint as storage', (): void => {
  let app: App;

  beforeAll(async(): Promise<void> => {
    const variables = {
      ...getDefaultVariables(port, baseUrl),
      'urn:solid-server:default:variable:sparqlEndpoint': 'http://localhost:4000/sparql',
    };

    // Create and start the server
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      [
        getPresetConfigPath('storage/backend/sparql.json'),
        getTestConfigPath('ldp-with-auth.json'),
      ],
      variables,
    ) as Record<string, any>;
    ({ app } = instances);

    await app.start();
  });

  afterAll(async(): Promise<void> => {
    await app.stop();
  });

  it('can add a Turtle file to the store.', async(): Promise<void> => {
    // PUT
    const documentUrl = `${baseUrl}person`;
    const body = (await fs.readFile(joinFilePath(__dirname, '../assets/person.ttl'))).toString('utf-8');
    const response = await putResource(documentUrl, { contentType: 'text/turtle', body });
    expect(response).toBeTruthy();
  });
});
