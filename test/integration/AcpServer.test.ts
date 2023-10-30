import fetch from 'cross-fetch';
import { BasicRepresentation } from '../../src/http/representation/BasicRepresentation';
import type { App } from '../../src/init/App';
import type { ResourceStore } from '../../src/storage/ResourceStore';
import { joinUrl } from '../../src/util/PathUtil';
import { AcpHelper } from '../util/AcpHelper';
import { getPort } from '../util/Util';
import {
  getDefaultVariables,
  getPresetConfigPath,
  getTestConfigPath,
  getTestFolder,
  instantiateFromConfig,
  removeFolder,
} from './Config';

const port = getPort('AcpServer');
const baseUrl = `http://localhost:${port}/`;

const rootFilePath = getTestFolder('full-config-acp');
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

describe.each(stores)('An LDP handler with ACP using %s', (name, { storeConfig, teardown }): void => {
  let app: App;
  let store: ResourceStore;
  let acpHelper: AcpHelper;

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
        getTestConfigPath('ldp-with-acp.json'),
      ],
      variables,
    ) as Record<string, any>;
    ({ app, store } = instances);

    await app.start();

    // Create test helper for manipulating acl
    acpHelper = new AcpHelper(store);
  });

  afterAll(async(): Promise<void> => {
    await teardown();
    await app.stop();
  });

  it('provides no access if no ACRs are defined.', async(): Promise<void> => {
    const response = await fetch(baseUrl);
    expect(response.status).toBe(401);
  });

  it('provides access if the correct ACRs are defined.', async(): Promise<void> => {
    await acpHelper.setAcp(baseUrl, acpHelper.createAcr({
      resource: baseUrl,
      policies: [ acpHelper.createPolicy({
        allow: [ 'read' ],
        anyOf: [ acpHelper.createMatcher({ publicAgent: true }) ],
      }) ],
    }));
    const response = await fetch(baseUrl);
    expect(response.status).toBe(200);
  });

  it('uses ACP inheritance.', async(): Promise<void> => {
    const target = joinUrl(baseUrl, 'foo');
    await store.setRepresentation({ path: target }, new BasicRepresentation('test', 'text/plain'));
    await acpHelper.setAcp(baseUrl, acpHelper.createAcr({
      resource: baseUrl,
      memberPolicies: [ acpHelper.createPolicy({
        allow: [ 'read' ],
        anyOf: [ acpHelper.createMatcher({ publicAgent: true }) ],
      }) ],
    }));
    await acpHelper.setAcp(target, acpHelper.createAcr({
      resource: baseUrl,
      policies: [ acpHelper.createPolicy({
        allow: [ 'write' ],
        anyOf: [ acpHelper.createMatcher({ publicAgent: true }) ],
      }) ],
    }));
    const response = await fetch(target);
    expect(response.status).toBe(200);
  });

  it('requires control permissions to access ACRs.', async(): Promise<void> => {
    const baseAcr = joinUrl(baseUrl, '.acr');
    const turtle = acpHelper.toTurtle(acpHelper.createAcr({
      resource: baseUrl,
      policies: [ acpHelper.createPolicy({
        allow: [ 'read' ],
        anyOf: [ acpHelper.createMatcher({ publicAgent: true }) ],
      }) ],
    }));
    let response = await fetch(baseAcr);
    expect(response.status).toBe(401);
    response = await fetch(baseAcr, { method: 'PUT', headers: { 'content-type': 'text/turtle' }, body: turtle });
    expect(response.status).toBe(401);

    await acpHelper.setAcp(baseUrl, acpHelper.createAcr({
      resource: baseUrl,
      policies: [ acpHelper.createPolicy({
        allow: [ 'control' ],
        anyOf: [ acpHelper.createMatcher({ publicAgent: true }) ],
      }) ],
    }));
    response = await fetch(baseAcr);
    expect(response.status).toBe(200);
    response = await fetch(baseAcr, { method: 'PUT', headers: { 'content-type': 'text/turtle' }, body: turtle });
    expect(response.status).toBe(205);
    // Can now also read root container due to updated permissions
    response = await fetch(baseUrl);
    expect(response.status).toBe(200);
  });

  it('returns the required Link headers.', async(): Promise<void> => {
    const baseAcr = joinUrl(baseUrl, '.acr');
    const response = await fetch(baseAcr, { method: 'OPTIONS' });
    const linkHeaders = response.headers.get('link');
    expect(linkHeaders).toContain('<http://www.w3.org/ns/solid/acp#AccessControlResource>; rel="type"');

    expect(linkHeaders).toContain('<http://www.w3.org/ns/auth/acl#Read>; rel="http://www.w3.org/ns/solid/acp#grant"');
    expect(linkHeaders).toContain('<http://www.w3.org/ns/auth/acl#Append>; rel="http://www.w3.org/ns/solid/acp#grant"');
    expect(linkHeaders).toContain('<http://www.w3.org/ns/auth/acl#Write>; rel="http://www.w3.org/ns/solid/acp#grant"');
    expect(linkHeaders).toContain('<http://www.w3.org/ns/auth/acl#Control>; rel="http://www.w3.org/ns/solid/acp#grant"');

    expect(linkHeaders).toContain('<http://www.w3.org/ns/solid/acp#target>; rel="http://www.w3.org/ns/solid/acp#attribute"');
    expect(linkHeaders).toContain('<http://www.w3.org/ns/solid/acp#agent>; rel="http://www.w3.org/ns/solid/acp#attribute"');
    expect(linkHeaders).toContain('<http://www.w3.org/ns/solid/acp#client>; rel="http://www.w3.org/ns/solid/acp#attribute"');
    expect(linkHeaders).toContain('<http://www.w3.org/ns/solid/acp#issuer>; rel="http://www.w3.org/ns/solid/acp#attribute"');
  });
});
