import { promises as fs } from 'node:fs';
import fetch from 'cross-fetch';
import { joinFilePath } from '../../src';
import type { App } from '../../src';
import { deleteResource, getResource, putResource } from '../util/FetchUtil';
import { describeIf, getPort } from '../util/Util';
import { getDefaultVariables, getPresetConfigPath, getTestConfigPath, instantiateFromConfig } from './Config';

const port = getPort('SparqlStorage');
const baseUrl = `http://localhost:${port}/`;
const sparqlEndpoint = 'http://localhost:4000/sparql';

/* eslint-disable jest/require-top-level-describe, jest/consistent-test-it */
describeIf('docker')('A server with a SPARQL endpoint as storage', (): void => {
  let app: App;

  beforeAll(async(): Promise<void> => {
    const variables = {
      ...getDefaultVariables(port, baseUrl),
      'urn:solid-server:default:variable:sparqlEndpoint': sparqlEndpoint,
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

  it('can add a Turtle file to the SPARQL store.', async(): Promise<void> => {
    // PUT
    const documentUrl = `${baseUrl}person`;
    const body = (await fs.readFile(joinFilePath(__dirname, '../assets/person.ttl'))).toString('utf-8');
    const response = await putResource(documentUrl, { contentType: 'text/turtle', body });
    expect(response).toBeTruthy();
  });

  it('can retrieve a Turtle file from the SPARQL store.', async(): Promise<void> => {
    // GET
    const documentUrl = `${baseUrl}person`;
    const response = await getResource(documentUrl, { accept: 'text/turtle' }, { contentType: 'text/turtle' });

    const body = await response.text();
    expect(body).toContain('Ruben Verborgh');
    expect(body).toContain('http://xmlns.com/foaf/0.1/Person');
  });

  it('can update a Turtle file in the SPARQL store.', async(): Promise<void> => {
    // PUT updated content
    const documentUrl = `${baseUrl}person`;
    const updatedBody = `PREFIX : <https://ruben.verborgh.org/profile/#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

:me a foaf:Person;
    foaf:name  "Ruben Verborgh Updated"@en;
    foaf:homepage <https://ruben.verborgh.org/>.`;

    const response = await putResource(documentUrl, { contentType: 'text/turtle', body: updatedBody, exists: true });
    expect(response).toBeTruthy();

    // Verify the update
    const getResponse = await getResource(documentUrl, { accept: 'text/turtle' }, { contentType: 'text/turtle' });
    const body = await getResponse.text();
    expect(body).toContain('Ruben Verborgh Updated');
  });

  it('can delete a Turtle file from the SPARQL store.', async(): Promise<void> => {
    // DELETE
    const documentUrl = `${baseUrl}person`;
    await deleteResource(documentUrl);
  });

  it('can create and manage containers in the SPARQL store.', async(): Promise<void> => {
    // Create a container
    const containerUrl = `${baseUrl}test-container/`;
    const response = await putResource(containerUrl, { contentType: 'text/turtle', body: '' });
    expect(response).toBeTruthy();

    // Create a resource in the container
    const resourceUrl = `${baseUrl}test-container/resource`;
    const resourceBody = `PREFIX : <https://example.org/>
:resource a :TestResource;
    :hasValue "test value".`;

    const resourceResponse = await putResource(resourceUrl, { contentType: 'text/turtle', body: resourceBody });
    expect(resourceResponse).toBeTruthy();

    // Verify the resource exists
    const getResponse = await getResource(resourceUrl, { accept: 'text/turtle' }, { contentType: 'text/turtle' });
    const body = await getResponse.text();
    expect(body).toContain('TestResource');
    expect(body).toContain('test value');

    // Clean up
    await deleteResource(resourceUrl);
    await deleteResource(containerUrl);
  });

  it('can handle JSON-LD data in the SPARQL store.', async(): Promise<void> => {
    const documentUrl = `${baseUrl}test-jsonld`;
    const jsonLdBody = {
      '@context': 'https://json-ld.org/contexts/person.jsonld',
      '@id': 'https://example.org/person/1',
      name: 'John Doe',
      jobTitle: 'Software Engineer',
    };

    const response = await putResource(documentUrl, {
      contentType: 'application/ld+json',
      body: JSON.stringify(jsonLdBody),
    });
    expect(response).toBeTruthy();

    // Verify the JSON-LD can be retrieved
    const getResponse = await getResource(
      documentUrl,
      { accept: 'application/ld+json' },
      { contentType: 'application/ld+json' },
    );
    const body = await getResponse.text();
    // Check if the response contains the expected data
    expect(body).toContain('John Doe');

    // Clean up
    await deleteResource(documentUrl);
  });

  it('writes to the SPARQL endpoint instead of some other store.', async(): Promise<void> => {
    // First, add some test data with a unique identifier
    const documentUrl = `${baseUrl}sparql-test-${Date.now()}`;
    const testData = `PREFIX : <https://example.org/>
:test a :TestClass;
    :hasProperty "test value".`;

    await putResource(documentUrl, { contentType: 'text/turtle', body: testData });

    // Use ASK query to check if our specific document URL exists in the database
    // This will work even if the database has more than 10 results
    const query = `ASK WHERE { GRAPH <${documentUrl}> { ?s ?p ?o } }`;
    const queryResponse = await fetch(sparqlEndpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/sparql-query',
      },
      body: query,
    });
    expect(queryResponse.status).toBe(200);

    const queryResult = await queryResponse.text();
    expect(queryResult).toContain('true');

    // Clean up
    await deleteResource(documentUrl);
  });
});
