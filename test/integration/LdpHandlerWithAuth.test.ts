import type { Server } from 'http';
import fetch from 'cross-fetch';
import type { Initializer, ResourceStore } from '../../src/';
import { BasicRepresentation } from '../../src/';
import type { HttpServerFactory } from '../../src/server/HttpServerFactory';
import { AclHelper } from '../util/AclHelper';
import { deleteResource, getResource, postResource, putResource } from '../util/FetchUtil';
import { getPort } from '../util/Util';
import {
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
    storeConfig: 'storage/resource-store/memory.json',
    teardown: jest.fn(),
  }],
  [ 'on-disk storage', {
    storeConfig: 'storage/resource-store/file.json',
    teardown: (): void => removeFolder(rootFilePath),
  }],
];

describe.each(stores)('An LDP handler with auth using %s', (name, { storeConfig, teardown }): void => {
  let server: Server;
  let initializer: Initializer;
  let factory: HttpServerFactory;
  let store: ResourceStore;
  let aclHelper: AclHelper;
  const permanent = `${baseUrl}document.txt`;

  beforeAll(async(): Promise<void> => {
    const variables: Record<string, any> = {
      'urn:solid-server:default:variable:baseUrl': baseUrl,
      'urn:solid-server:default:variable:showStackTrace': true,
      'urn:solid-server:default:variable:rootFilePath': rootFilePath,
    };

    // Create and initialize the server
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      [
        getPresetConfigPath(storeConfig),
        getTestConfigPath('ldp-with-auth.json'),
      ],
      variables,
    ) as Record<string, any>;
    ({ factory, initializer, store } = instances);

    await initializer.handleSafe();
    server = factory.startServer(port);

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
    await new Promise((resolve, reject): void => {
      server.close((error): void => error ? reject(error) : resolve());
    });
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
    await putResource(document, { contentType: 'text/plain', body: 'TESTDATA' });

    // GET
    const response = await getResource(document);
    await expect(response.text()).resolves.toBe('TESTDATA');
    expect(response.headers.get('wac-allow')).toBe('user="read write append",public="read write append"');

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
    expect(response.headers.get('wac-allow')).toBe('user="control",public="control"');

    // Close response
    await response.text();
  });
});
