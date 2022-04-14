import fetch from 'cross-fetch';
import { pathExists } from 'fs-extra';
import type { App } from '../../src/init/App';
import { getPort } from '../util/Util';
import {
  getDefaultVariables,
  getTestConfigPath,
  getTestFolder,
  instantiateFromConfig,
  removeFolder,
} from './Config';

const port = getPort('FileBackendEncodedSlashHandling');
const baseUrl = `http://localhost:${port}/`;

const rootFilePath = getTestFolder('file-backend-encoded-slash-handling');

describe('A server with a file backend storage', (): void => {
  let app: App;

  beforeAll(async(): Promise<void> => {
    await removeFolder(rootFilePath);
    const variables = {
      ...getDefaultVariables(port, baseUrl),
      'urn:solid-server:default:variable:rootFilePath': rootFilePath,
    };

    // Create and start the server
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      [
        getTestConfigPath('server-file.json'),
      ],
      variables,
    ) as Record<string, any>;
    ({ app } = instances);

    await app.start();
  });

  afterAll(async(): Promise<void> => {
    // Await removeFolder(rootFilePath);
    await app.stop();
  });

  it('can put a document for which the URI path contains url encoded separator characters.', async(): Promise<void> => {
    const url = `${baseUrl}/c1/c2/t1%2F`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'content-type': 'text/plain',
      },
      body: 'abc',
    });
    expect(res.status).toBe(201);
    expect(res.headers.get('location')).toBe(url);

    // The resource should not be accessible through ${baseUrl}/c1/c2/t1/.
    const check1 = await fetch(`${baseUrl}/c1/c2/t1/}`, {
      method: 'GET',
      headers: {
        accept: 'text/plain',
      },
    });
    expect(check1.status).toBe(404);

    // Check that the created resource is not a container
    const check2 = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'text/plain',
      },
    });
    const linkHeaderValues = check2.headers.get('link')!.split(',').map((item): string => item.trim());
    expect(linkHeaderValues).not.toContain('<http://www.w3.org/ns/ldp#Container>; rel="type"');

    // Check that the appropriate file path exists
    const check3 = await pathExists(`${rootFilePath}/c1/c2/t1%2F$.txt`);
    expect(check3).toBe(true);
  });

  it('can post a document using a slug that contains url encoded separator characters.', async(): Promise<void> => {
    const slug = 't1%2Faa';
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'content-type': 'text/plain',
        slug,
      },
      body: 'abc',
    });
    expect(res.status).toBe(201);
    expect(res.headers.get('location')).toBe(`${baseUrl}${slug}`);

    // Check that the the appropriate file path exists
    const check = await pathExists(`${rootFilePath}/${slug}$.txt`);
    expect(check).toBe(true);
  });

  it('prevents accessing a document via a different identifier that results in the same path after url decoding.',
    async(): Promise<void> => {
      // First put a resource using a path without encoded separator characters: foo/bar
      const url = `${baseUrl}/foo/bar`;
      await fetch(url, {
        method: 'PUT',
        headers: {
          'content-type': 'text/plain',
        },
        body: 'abc',
      });

      // The resource at foo/bar should not be accessible using the url encoded variant of this path: foo%2Fbar
      const check1 = await fetch(`${baseUrl}/foo%2Fbar`, {
        method: 'GET',
        headers: {
          accept: 'text/plain',
        },
      });
      // Expect foo%2Fbar to correctly refer to a different document, which does not exist.
      expect(check1.status).toBe(404);

      // Check that the the appropriate file path for foo/bar exists
      const check2 = await pathExists(`${rootFilePath}/foo/bar$.txt`);
      expect(check2).toBe(true);

      // Next, put a resource using a path with an encoded separator character: bar%2Ffoo
      await fetch(`${baseUrl}/bar%2Ffoo`, {
        method: 'PUT',
        headers: {
          'content-type': 'text/plain',
        },
        body: 'abc',
      });

      // The resource at bar%2Ffoo should not be accessible through bar/foo
      const check3 = await fetch(`${baseUrl}/bar/foo`, {
        method: 'GET',
        headers: {
          accept: 'text/plain',
        },
      });
      // Expect bar/foo to correctly refer to a different document, which does not exist.
      expect(check3.status).toBe(404);

      // Check that the the appropriate file path for bar%foo exists
      const check4 = await pathExists(`${rootFilePath}/bar%2Ffoo$.txt`);
      expect(check4).toBe(true);
    });
});
