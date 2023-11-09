import { promises as fsPromises } from 'node:fs';
import fetch from 'cross-fetch';
import type { App, ResourceStore } from '../../src/';
import { BasicRepresentation, isSystemError, joinFilePath, joinUrl } from '../../src/';
import { AclHelper } from '../util/AclHelper';
import { deleteResource, getResource, postResource, putResource } from '../util/FetchUtil';
import { getPort } from '../util/Util';
import {
  getDefaultVariables,
  getPresetConfigPath,
  getTestConfigPath,
  getTestFolder,
  instantiateFromConfig,
  removeFolder,
} from './Config';

const port = getPort('LpdHandlerWithAuth');
const baseUrl = `http://localhost:${port}/`;

const rootFilePath = getTestFolder('full-config-acl');
const stores: [string, any][] = [
  [ 'in-memory storage', {
    storeConfig: 'storage/backend/memory.json',
    teardown: jest.fn(),
  }],
  [ 'on-disk storage', {
    storeConfig: 'storage/backend/file.json',
    teardown: async(): Promise<void> => removeFolder(rootFilePath),
  }],
];

describe.each(stores)('An LDP handler with auth using %s', (name, { storeConfig, teardown }): void => {
  let app: App;
  let store: ResourceStore;
  let aclHelper: AclHelper;
  const permanent = `${baseUrl}document.txt`;

  beforeAll(async(): Promise<void> => {
    const variables = {
      ...getDefaultVariables(port, baseUrl),
      'urn:solid-server:default:variable:rootFilePath': rootFilePath,
    };

    // Create and start the server
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      [
        getPresetConfigPath(storeConfig),
        getTestConfigPath('ldp-with-auth.json'),
      ],
      variables,
    ) as Record<string, any>;
    ({ app, store } = instances);

    await app.start();

    // Create test helper for manipulating acl
    aclHelper = new AclHelper(store);
  });

  beforeEach(async(): Promise<void> => {
    // Set the root acl file to allow everything and create a single document
    await store.setRepresentation({ path: permanent }, new BasicRepresentation('PERMANENT', 'text/plain'));
    await aclHelper.setSimpleAcl(baseUrl, {
      permissions: { read: true, write: true, append: true, control: true },
      agentClass: 'agent',
      accessTo: true,
      default: true,
    });
  });

  afterAll(async(): Promise<void> => {
    await teardown();
    await app.stop();
  });

  it('can add a document, read it and delete it if allowed.', async(): Promise<void> => {
    await aclHelper.setSimpleAcl(baseUrl, {
      permissions: { read: true, write: true, append: true },
      agentClass: 'agent',
      accessTo: true,
      default: true,
    });

    // PUT
    const document = `${baseUrl}test.txt`;
    await putResource(document, { contentType: 'text/plain', body: 'TESTDATA', exists: false });

    // GET
    const response = await getResource(document);
    await expect(response.text()).resolves.toBe('TESTDATA');
    expect(response.headers.get('wac-allow')).toBe('user="append read write",public="append read write"');

    // DELETE
    await deleteResource(document);
  });

  it('can not add a file to the store if not allowed.', async(): Promise<void> => {
    await aclHelper.setSimpleAcl(baseUrl, {
      permissions: { read: true, write: true, append: true },
      agentClass: 'authenticated',
      accessTo: true,
      default: true,
    });

    // PUT fail
    const documentUrl = `${baseUrl}test.txt`;
    const response = await fetch(documentUrl, { method: 'PUT' });
    expect(response.status).toBe(401);
  });

  it('can not add/delete if only read is allowed.', async(): Promise<void> => {
    await aclHelper.setSimpleAcl(baseUrl, {
      permissions: { read: true },
      agentClass: 'agent',
      accessTo: true,
      default: true,
    });

    // PUT fail
    const document = `${baseUrl}test.txt`;
    let response = await fetch(document, { method: 'PUT' });
    expect(response.status).toBe(401);

    // GET permanent file
    response = await getResource(permanent);
    await expect(response.text()).resolves.toBe('PERMANENT');
    expect(response.headers.get('wac-allow')).toBe('user="read",public="read"');

    // DELETE fail
    response = await fetch(permanent, { method: 'DELETE' });
    expect(response.status).toBe(401);
  });

  it('can add files but not write to them if append is allowed.', async(): Promise<void> => {
    await aclHelper.setSimpleAcl(baseUrl, {
      permissions: { append: true },
      agentClass: 'agent',
      accessTo: true,
      default: true,
    });

    // POST
    const slug = 'slug';
    let response = await postResource(baseUrl, { contentType: 'text/plain', slug, body: 'SLUGDATA' });
    const document = response.headers.get('location')!;

    // PUT fail
    response = await fetch(document, { method: 'PUT' });
    expect(response.status).toBe(401);

    // DELETE fail
    response = await fetch(document, { method: 'DELETE' });
    expect(response.status).toBe(401);

    // Clean up resource
    await store.deleteResource({ path: document });
  });

  it('can not access an acl file if no control rights are provided.', async(): Promise<void> => {
    await aclHelper.setSimpleAcl(baseUrl, {
      permissions: { read: true, write: true, append: true },
      agentClass: 'agent',
      accessTo: true,
    });

    const response = await fetch(`${baseUrl}.acl`);
    expect(response.status).toBe(401);
  });

  it('can only access an acl file if control rights are provided.', async(): Promise<void> => {
    await aclHelper.setSimpleAcl(baseUrl, {
      permissions: { control: true },
      agentClass: 'agent',
      accessTo: true,
    });

    const response = await fetch(`${baseUrl}.acl`);
    expect(response.status).toBe(200);
    expect(response.headers.get('wac-allow'))
      .toBe('user="append control read write",public="append control read write"');

    // Close response
    await response.text();
  });

  it('returns the legacy WWW-Authenticate header on 401 requests.', async(): Promise<void> => {
    await aclHelper.setSimpleAcl(baseUrl, {
      permissions: {},
      agentClass: 'agent',
      accessTo: true,
    });

    const response = await fetch(`${baseUrl}.acl`);
    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toBe('Bearer scope="openid webid"');
  });

  it('supports file paths with spaces.', async(): Promise<void> => {
    // Specific problem for file store, so only do this if the rootFilePath folder exists
    try {
      await fsPromises.lstat(rootFilePath);
    } catch (error: unknown) {
      if (isSystemError(error) && error.code === 'ENOENT') {
        return;
      }
      throw error;
    }

    // Correct identifier when there are spaces
    const identifier = { path: `${baseUrl}with%20spaces.txt` };

    // Set acl specifically for this identifier
    const acl = `@prefix acl: <http://www.w3.org/ns/auth/acl#>.
@prefix foaf: <http://xmlns.com/foaf/0.1/>.
<#authorization>
    a               acl:Authorization;
    acl:agentClass  foaf:Agent;
    acl:mode        acl:Read;
    acl:accessTo    <${identifier.path}>.`;

    // Prevent other access to make sure there is no hierarchy bug
    await aclHelper.setSimpleAcl(baseUrl, {
      permissions: {},
      agentClass: 'agent',
      default: true,
    });

    // Write files manually to make sure there are spaces
    await fsPromises.writeFile(joinFilePath(rootFilePath, 'with spaces.txt.acl'), acl);
    await fsPromises.writeFile(joinFilePath(rootFilePath, 'with spaces.txt'), 'valid data');

    // GET file
    const response = await getResource(identifier.path);
    await expect(response.text()).resolves.toContain('valid data');
  });

  it('prevents creation of intermediate intermediate containers if they are not allowed.', async(): Promise<void> => {
    const url = joinUrl(baseUrl, 'foo/bar/');
    // Not allowed since there are no append permissions on the base container
    await aclHelper.setSimpleAcl(baseUrl, {
      permissions: { write: true },
      agentClass: 'agent',
      default: true,
    });
    let response = await fetch(url, { method: 'PUT' });
    expect(response.status).toBe(401);

    // Not allowed since there are no write permissions for the target
    await aclHelper.setSimpleAcl(baseUrl, {
      permissions: { append: true },
      agentClass: 'agent',
      accessTo: true,
    });
    response = await fetch(url, { method: 'PUT' });
    expect(response.status).toBe(401);

    // This covers all required permissions
    await aclHelper.setSimpleAcl(baseUrl, [
      { permissions: { append: true }, agentClass: 'agent', accessTo: true },
      { permissions: { write: true }, agentClass: 'agent', default: true },
    ]);
    await putResource(url, { contentType: 'text/plain', exists: false });
  });
});
