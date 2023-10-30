import assert from 'node:assert';
import fetch from 'cross-fetch';
import type { App } from '../../src/init/App';
import { getPort } from '../util/Util';
import { getDefaultVariables, getTestConfigPath, instantiateFromConfig } from './Config';

const port = getPort('ContentNegotiation');
const baseUrl = `http://localhost:${port}`;

const documents = [
  [ '/turtle', 'text/turtle', '# Test' ],
  [ '/markdown', 'text/markdown', '# Test' ],
  [ '/plain', 'text/plain; charset=utf-8', '# Test' ],
];

const cases: [string, string, string][] = [
  [ '/turtle', 'text/turtle', '' ],
  [ '/turtle', 'text/turtle', '*/*' ],
  [ '/turtle', 'text/turtle', 'text/html,*/*;q=0.1' ],
  [ '/turtle', 'application/json', 'application/json' ],
  [ '/turtle', 'application/ld+json', 'application/ld+json' ],
  [ '/turtle', 'application/octet-stream', 'application/octet-stream' ],
  [ '/markdown', 'text/markdown', '' ],
  [ '/markdown', 'text/markdown', '*/*' ],
  [ '/markdown', 'text/markdown', 'text/html,text/markdown' ],
  [ '/markdown', 'text/markdown', 'text/markdown;q=0.9, text/html;q=0.1' ],
  [ '/markdown', 'text/html', 'text/html' ],
  [ '/markdown', 'text/html', 'text/html,*/*;q=0.8' ],
  [ '/markdown', 'text/html', 'text/markdown;q=0.1, text/html;q=0.9' ],
  [ '/markdown', 'application/octet-stream', 'application/octet-stream' ],
  [ '/plain', 'text/plain; charset=utf-8', 'text/plain' ],
  [ '/plain', 'text/plain; charset=utf-8', 'text/plain;q=0.1, text/markdown;q=0.9' ],
];

describe('Content negotiation', (): void => {
  let app: App;

  beforeAll(async(): Promise<void> => {
    // Start the server
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      getTestConfigPath('server-memory.json'),
      getDefaultVariables(port, baseUrl),
    ) as Record<string, any>;
    ({ app } = instances);
    await app.start();

    // Create documents
    for (const [ slug, contentType, body ] of documents) {
      const res = await fetch(`${baseUrl}${slug}`, {
        method: 'PUT',
        headers: { 'content-type': contentType },
        body,
      });
      assert.strictEqual(res.status, 201);
    }
  });

  afterAll(async(): Promise<void> => {
    await app.stop();
  });

  describe.each(cases)('a request for %s', (name, expected, accept): void => {
    it(`results in ${expected} in response to Accept: ${accept}`, async(): Promise<void> => {
      const res = await fetch(`${baseUrl}${name}`, { headers: { accept }});
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe(expected);
    });
  });
});
