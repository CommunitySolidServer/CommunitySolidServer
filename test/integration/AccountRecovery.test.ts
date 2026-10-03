import fetch from 'cross-fetch';
import { Parser } from 'n3';
import { BasicRepresentation } from '../../src/http/representation/BasicRepresentation';
import type { App } from '../../src/init/App';
import type { ResourceStore } from '../../src/storage/ResourceStore';
import { readableToString } from '../../src/util/StreamUtil';
import { SOLID } from '../../src/util/Vocabularies';
import { register } from '../util/AccountUtil';
import { getPort } from '../util/Util';
import { getDefaultVariables, getPresetConfigPath, getTestConfigPath, instantiateFromConfig } from './Config';

const port = getPort('AccountRecovery');
const baseUrl = `http://localhost:${port}/`;

const setups = [
  {
    name: 'in suffix mode (in-memory storage)',
    mode: 'suffix',
    scheme: 'wac',
    configs: [ getTestConfigPath('server-memory.json') ],
  },
  {
    name: 'in subdomain mode (in-memory storage)',
    mode: 'subdomain',
    scheme: 'wac',
    configs: [
      getPresetConfigPath('storage/backend/memory.json'),
      getTestConfigPath('server-subdomains-unsafe.json'),
    ],
  },
  {
    name: 'in suffix mode with ACP authorization',
    mode: 'suffix',
    scheme: 'acp',
    configs: [ getTestConfigPath('server-acp.json') ],
  },
];

describe.each(setups)('A server with account-authorized WebID recovery $name', ({ mode, scheme, configs }): void => {
  let app: App;
  let store: ResourceStore;
  let pod: string;
  let webId: string;
  let authorization: string;
  let controls: any;
  const podHost = `alice.localhost:${port}`;
  const cardPath = 'profile/card';
  const authorizationPath = scheme === 'acp' ? 'profile/card.acr' : 'profile/card.acl';
  let cardUrl: string;
  let aclUrl: string;

  /**
   * Requests a pod resource: in subdomain mode the request is sent to the base URL with a forwarded
   * host header, since there are no DNS entries for the pod hosts in the test environment.
   */
  async function podFetch(path: string, init?: any): Promise<any> {
    return mode === 'subdomain' ?
        fetch(`${baseUrl}${path}`, { ...init, headers: { forwarded: `host=${podHost}`, ...init?.headers }}) :
        fetch(`${pod}${path}`, init);
  }

  async function fetchCard(init?: any): Promise<any> {
    return podFetch(cardPath, init);
  }

  /**
   * Writes to the pod as its owner: subdomain mode does this over HTTP with the debug authenticator
   * of the unsafe config, suffix mode writes through the store since pod requests need Solid-OIDC there.
   */
  async function ownerWrite(path: string, value: string): Promise<void> {
    if (mode === 'subdomain') {
      const res = await podFetch(path, {
        method: 'PUT',
        headers: { authorization: `WebID ${webId}`, 'content-type': 'text/turtle' },
        body: value,
      });
      expect(res.status).toBe(205);
    } else {
      await store.setRepresentation({ path: `${pod}${path}` }, new BasicRepresentation(value, 'text/turtle'));
    }
  }

  async function ownerDelete(path: string): Promise<void> {
    if (mode === 'subdomain') {
      const res = await podFetch(path, { method: 'DELETE', headers: { authorization: `WebID ${webId}` }});
      expect(res.status).toBe(205);
    } else {
      await store.deleteResource({ path: `${pod}${path}` });
    }
  }

  /**
   * Verifies that the authorization of the card still gives the owner full access.
   */
  async function expectOwnerAccess(): Promise<void> {
    if (mode === 'subdomain') {
      const res = await podFetch('owner-check.txt', {
        method: 'PUT',
        headers: { authorization: `WebID ${webId}`, 'content-type': 'text/plain' },
        body: 'owner access',
      });
      expect([ 201, 205 ]).toContain(res.status);
    } else if (scheme === 'acp') {
      // Only the generated ACR is checked: the pod's own authorization (root ACR) belongs to the account
      // and its WebIDs, can be changed by them, and recovery does not touch it
      const acr = await readableToString((await store.getRepresentation({ path: aclUrl }, {})).data);
      expect(acr).toContain('acp:PublicAgent');
    } else {
      const acl = await readableToString((await store.getRepresentation({ path: aclUrl }, {})).data);
      expect(acl).toContain('acl:agentClass foaf:Agent');
      expect(acl).toContain(`acl:agent <${webId}>`);
      expect(acl).toContain('acl:Control');
    }
  }

  async function recover(options?: Record<string, unknown>): Promise<any> {
    return fetch(controls.account.recoverWebId, {
      method: 'POST',
      headers: { authorization, 'content-type': 'application/json' },
      body: JSON.stringify(options ?? { webId, confirm: true }),
    });
  }

  async function fetchView(): Promise<any> {
    const res = await fetch(controls.account.recoverWebId, { headers: { authorization }});
    expect(res.status).toBe(200);
    return res.json();
  }

  /**
   * An authorization that only allows the owner to access the card, so it is not publicly readable.
   */
  function ownerOnlyAcl(): string {
    return [
      '@prefix acl: <http://www.w3.org/ns/auth/acl#>.',
      '',
      '<#owner>',
      '    a acl:Authorization;',
      `    acl:accessTo <${cardUrl}>;`,
      `    acl:agent <${webId}>;`,
      '    acl:mode acl:Read, acl:Write, acl:Control.',
      '',
    ].join('\n');
  }

  beforeAll(async(): Promise<void> => {
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      configs,
      getDefaultVariables(port, baseUrl),
    ) as Record<string, any>;
    ({ app, store } = instances);
    await app.start();

    ({ pod, webId, authorization, controls } = await register(baseUrl, {
      email: 'alice@example.com',
      password: 'secret',
      podName: 'alice',
    }));
    cardUrl = `${pod}${cardPath}`;
    aclUrl = `${cardUrl}${scheme === 'acp' ? '.acr' : '.acl'}`;
  });

  afterAll(async(): Promise<void> => {
    await app.stop();
  });

  it('lists the recoverable WebIDs and the pods of the account.', async(): Promise<void> => {
    const json = await fetchView();
    expect(json.webIds).toEqual([ webId ]);
    expect(json.pods).toEqual([ pod ]);
    expect(json.fields).toEqual({
      webId: { required: true, type: 'string' },
      confirm: { required: true, type: 'boolean' },
    });
  });

  it('has an HTML page.', async(): Promise<void> => {
    const res = await fetch(controls.account.recoverWebId, {
      headers: { authorization, accept: 'text/html' },
    });
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toContain('Recover WebID');
  });

  it('requires a session.', async(): Promise<void> => {
    expect((await fetch(controls.account.recoverWebId)).status).toBe(401);
    expect((await fetch(controls.account.recoverWebId, { method: 'POST' })).status).toBe(401);
  });

  it('requires confirmation.', async(): Promise<void> => {
    const res = await recover({ webId });
    expect(res.status).toBe(400);
    // The card is untouched
    expect((await fetchCard()).status).toBe(200);
  });

  it('does not recover a WebID of a different account.', async(): Promise<void> => {
    const bob = await register(baseUrl, { email: 'bob@example.com', password: 'secret', podName: 'bob' });
    const res = await fetch(bob.controls.account.recoverWebId, {
      method: 'POST',
      headers: { authorization: bob.authorization, 'content-type': 'application/json' },
      body: JSON.stringify({ webId, confirm: true }),
    });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ message: expect.stringContaining('not linked to this account') });
  });

  it('recovers a card that was deleted.', async(): Promise<void> => {
    await ownerDelete(cardPath);
    // Deleting a resource also removes its authorization file, so the card is either denied or not found
    expect([ 401, 404 ]).toContain((await fetchCard()).status);

    const res = await recover();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      webId,
      cardUrl,
      link: expect.stringContaining('/webid/'),
      oidcIssuer: baseUrl,
    });
    // There was no card left to back up
    expect(json.backupUrl).toBeUndefined();

    const card = await fetchCard();
    expect(card.status).toBe(200);
    const quads = new Parser({ baseIRI: cardUrl }).parse(await card.text());
    expect(quads.some((entry): boolean => entry.subject.value === webId &&
      entry.predicate.value === SOLID.terms.oidcIssuer.value && entry.object.value === baseUrl)).toBe(true);

    // The link was still there and is still there
    const view = await fetchView();
    expect(view.webIds).toContain(webId);
  });

  it('restores the public authorization of the card.', async(): Promise<void> => {
    // Damage the authorization of the card: a WAC deployment loses its public read rule, an ACP deployment
    // loses the generated ACR. What anonymous requests may still do in ACP depends on the pod's own
    // authorization, which recovery does not touch.
    let damaged: boolean;
    if (scheme === 'acp') {
      await store.deleteResource({ path: `${pod}${authorizationPath}` });
      damaged = !await store.hasResource({ path: aclUrl });
    } else {
      await ownerWrite(authorizationPath, ownerOnlyAcl());
      damaged = (await fetchCard()).status === 401;
    }
    expect(damaged).toBe(true);

    const res = await recover();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.backupUrl).toBeDefined();

    expect((await fetchCard()).status).toBe(200);
    await expectOwnerAccess();
  });

  it('does not overwrite an earlier backup.', async(): Promise<void> => {
    const first = await (await recover()).json();
    expect(first.backupUrl).toBeDefined();
    const second = await (await recover()).json();
    expect(second.backupUrl).toBeDefined();
    expect(second.backupUrl).not.toBe(first.backupUrl);

    // The first backup still exists
    let backupExists: boolean;
    if (mode === 'subdomain') {
      const path = new URL(first.backupUrl).pathname.replace(/^\//u, '');
      backupExists = (await podFetch(path, { headers: { authorization: `WebID ${webId}` }})).status === 200;
    } else {
      backupExists = await store.hasResource({ path: first.backupUrl });
    }
    expect(backupExists).toBe(true);
  });

  it('does not recover a WebID that is not linked to the account.', async(): Promise<void> => {
    const links = await (await fetch(controls.account.webId, { headers: { authorization }})).json();
    expect(links.webIdLinks[webId]).toBeDefined();
    expect((await fetch(links.webIdLinks[webId], { method: 'DELETE', headers: { authorization }})).status).toBe(200);

    // It is no longer recoverable, so it is not offered either
    expect((await fetchView()).webIds).not.toContain(webId);

    const res = await recover();
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ message: expect.stringContaining('not linked to this account') });
    // The card is untouched
    expect((await fetchCard()).status).toBe(200);
  });
});
