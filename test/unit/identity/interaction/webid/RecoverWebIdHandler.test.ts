import { BasicRepresentation } from '../../../../../src/http/representation/BasicRepresentation';
import type { PodStore } from '../../../../../src/identity/interaction/pod/util/PodStore';
import { RecoverWebIdHandler } from '../../../../../src/identity/interaction/webid/RecoverWebIdHandler';
import type { WebIdStore } from '../../../../../src/identity/interaction/webid/util/WebIdStore';
import type { WebIdLinkRoute } from '../../../../../src/identity/interaction/webid/WebIdLinkRoute';
import type { ResourcesGenerator } from '../../../../../src/pods/generate/ResourcesGenerator';
import type { ResourceStore } from '../../../../../src/storage/ResourceStore';
import { BadRequestHttpError } from '../../../../../src/util/errors/BadRequestHttpError';
import { NotFoundHttpError } from '../../../../../src/util/errors/NotFoundHttpError';

function pathOf(identifier: any): string {
  return typeof identifier === 'string' ? identifier : identifier.path;
}

describe('A RecoverWebIdHandler', (): void => {
  const accountId = 'accountId';
  const podId = 'podId';
  const linkId = 'linkId';
  const baseUrl = 'http://example.com/';
  const podUrl = 'http://example.com/pod/';
  const cardUrl = 'http://example.com/pod/profile/card';
  const aclUrl = `${cardUrl}.acl`;
  const webId = `${cardUrl}#me`;
  const resource = 'http://example.com/.account/webId';
  let json: unknown;
  let resources: Set<string>;
  let backupRepresentation: BasicRepresentation;
  let podStore: jest.Mocked<PodStore>;
  let webIdStore: jest.Mocked<WebIdStore>;
  let webIdRoute: jest.Mocked<WebIdLinkRoute>;
  let resourcesGenerator: jest.Mocked<ResourcesGenerator>;
  let store: jest.Mocked<ResourceStore>;
  let handler: RecoverWebIdHandler;

  function writtenPaths(): string[] {
    return store.setRepresentation.mock.calls.map(([ identifier ]): string => pathOf(identifier));
  }

  function backups(): string[] {
    return writtenPaths().filter((path): boolean => path.includes('.backup-') && path.endsWith('.ttl'));
  }

  beforeEach(async(): Promise<void> => {
    json = { webId, confirm: true };
    resources = new Set([ cardUrl, aclUrl ]);
    backupRepresentation = new BasicRepresentation('card data', 'text/turtle');

    podStore = {
      findPods: jest.fn().mockResolvedValue([{ id: podId, baseUrl: podUrl }]),
    } satisfies Partial<PodStore> as any;

    webIdStore = {
      findLinks: jest.fn().mockResolvedValue([{ id: linkId, webId }]),
    } satisfies Partial<WebIdStore> as any;

    webIdRoute = {
      getPath: jest.fn().mockReturnValue(resource),
      matchPath: jest.fn(),
    };

    resourcesGenerator = {
      generate: jest.fn(async function* (): AsyncGenerator<any, void, undefined> {
        yield {
          identifier: { path: `${podUrl}profile/` },
          representation: new BasicRepresentation('container', 'text/turtle'),
        };
        yield {
          identifier: { path: `${podUrl}profile/card` },
          representation: new BasicRepresentation('new card', 'text/turtle'),
        };
        yield {
          identifier: { path: `${podUrl}profile/card.acl` },
          representation: new BasicRepresentation('new acl', 'text/turtle'),
        };
        yield {
          identifier: { path: `${podUrl}profile/extra` },
          representation: new BasicRepresentation('extra', 'text/plain'),
        };
      }),
    } satisfies Partial<ResourcesGenerator> as any;

    store = {
      hasResource: jest.fn(async({ path }: any): Promise<boolean> => resources.has(path)),
      getRepresentation: jest.fn(async({ path }: any): Promise<any> => {
        if (!resources.has(path)) {
          throw new NotFoundHttpError();
        }
        return path === cardUrl ? backupRepresentation : new BasicRepresentation('acl data', 'text/turtle');
      }),
      setRepresentation: jest.fn(async({ path }: any): Promise<any> => {
        resources.add(path);
      }),
      deleteResource: jest.fn(),
    } satisfies Partial<ResourceStore> as any;

    handler = new RecoverWebIdHandler({
      baseUrl,
      podStore,
      webIdStore,
      webIdRoute,
      resourcesGenerator,
      store,
    });
  });

  it('returns the recoverable WebIDs and the pods of the account.', async(): Promise<void> => {
    await expect(handler.getView({ accountId } as any)).resolves.toEqual({
      json: {
        webIds: [ webId ],
        pods: [ podUrl ],
        fields: {
          webId: { required: true, type: 'string' },
          confirm: { required: true, type: 'boolean' },
        },
      },
    });
    expect(podStore.findPods).toHaveBeenCalledTimes(1);
    expect(podStore.findPods).toHaveBeenLastCalledWith(accountId);
    expect(webIdStore.findLinks).toHaveBeenCalledTimes(1);
    expect(webIdStore.findLinks).toHaveBeenLastCalledWith(accountId);
  });

  it('lists the linked WebIDs hosted in a pod.', async(): Promise<void> => {
    webIdStore.findLinks.mockResolvedValueOnce([
      { id: 'custom', webId: `${podUrl}me#me` },
      { id: 'other', webId: `${cardUrl}#it` },
      { id: 'foreign', webId: 'http://other.example/profile/card#me' },
      { id: linkId, webId },
    ]);
    await expect(handler.getView({ accountId } as any)).resolves.toMatchObject({
      json: { webIds: [ `${podUrl}me#me`, `${cardUrl}#it`, webId ], pods: [ podUrl ]},
    });
  });

  it('throws an error if there is no account ID.', async(): Promise<void> => {
    await expect(handler.getView({} as any)).rejects.toThrow(NotFoundHttpError);
    await expect(handler.handle({ json } as any)).rejects.toThrow(NotFoundHttpError);
  });

  it('throws an error if the WebID is not linked to the account.', async(): Promise<void> => {
    webIdStore.findLinks.mockResolvedValue([]);
    await expect(handler.handle({ accountId, json } as any)).rejects.toThrow(
      `${webId} is not linked to this account.`,
    );
    expect(store.setRepresentation).toHaveBeenCalledTimes(0);
  });

  it('requires the confirmation option.', async(): Promise<void> => {
    json = { webId };
    await expect(handler.handle({ accountId, json } as any)).rejects.toThrow(BadRequestHttpError);
    expect(store.setRepresentation).toHaveBeenCalledTimes(0);
  });

  it('keeps the linked WebID and rewrites the card and its authorization.', async(): Promise<void> => {
    await expect(handler.handle({ accountId, json } as any)).resolves.toEqual({
      json: {
        webId,
        cardUrl,
        link: resource,
        oidcIssuer: baseUrl,
        backupUrl: expect.stringContaining('.backup-'),
      },
    });
    expect(webIdStore.findLinks).toHaveBeenLastCalledWith(accountId);
    expect(store.setRepresentation).toHaveBeenCalledWith({ path: cardUrl }, expect.anything());
    expect(store.setRepresentation).toHaveBeenCalledWith({ path: aclUrl }, expect.anything());
  });

  it('recovers the linked WebID with its own fragment.', async(): Promise<void> => {
    webIdStore.findLinks.mockResolvedValue([{ id: linkId, webId: `${cardUrl}#it` }]);
    json = { webId: `${cardUrl}#it`, confirm: true };
    const response = await handler.handle({ accountId, json } as any);
    expect(response.json).toMatchObject({ webId: `${cardUrl}#it`, cardUrl });
    expect(resourcesGenerator.generate).toHaveBeenCalledWith({ path: podUrl }, expect.objectContaining({
      webId: `${cardUrl}#it`,
    }));
  });

  it('throws an error if the WebID is not hosted in a pod of the account.', async(): Promise<void> => {
    const foreignWebId = 'http://other.example/profile/card#me';
    webIdStore.findLinks.mockResolvedValue([{ id: linkId, webId: foreignWebId }]);
    json = { webId: foreignWebId, confirm: true };
    await expect(handler.handle({ accountId, json } as any)).rejects.toThrow(BadRequestHttpError);
    expect(store.setRepresentation).toHaveBeenCalledTimes(0);
  });

  it('only writes the card and its authorization file.', async(): Promise<void> => {
    await handler.handle({ accountId, json } as any);
    expect(store.setRepresentation).not.toHaveBeenCalledWith({ path: `${podUrl}profile/` }, expect.anything());
    expect(store.setRepresentation).not.toHaveBeenCalledWith({ path: `${podUrl}profile/extra` }, expect.anything());
    expect(writtenPaths()).toContain(cardUrl);
    expect(writtenPaths()).toContain(aclUrl);
  });

  it('writes the generated ACP authorization.', async(): Promise<void> => {
    resourcesGenerator.generate.mockImplementation(async function* (): AsyncGenerator<any, void, undefined> {
      yield {
        identifier: { path: `${podUrl}profile/card` },
        representation: new BasicRepresentation('new card', 'text/turtle'),
      };
      yield {
        identifier: { path: `${podUrl}profile/card.acr` },
        representation: new BasicRepresentation('new acr', 'text/turtle'),
      };
    });
    const response = await handler.handle({ accountId, json } as any);
    expect(response.json.note).toBeUndefined();
    expect(store.setRepresentation).toHaveBeenCalledWith({ path: cardUrl }, expect.anything());
    expect(store.setRepresentation).toHaveBeenCalledWith({ path: `${cardUrl}.acr` }, expect.anything());
    // No WAC authorization is written: the templates decide which authorization file is generated
    expect(store.setRepresentation).not.toHaveBeenCalledWith({ path: aclUrl }, expect.anything());
  });

  it('backs up the current card as-is without adding an authorization.', async(): Promise<void> => {
    const response = await handler.handle({ accountId, json } as any);
    const backupUrl = response.json.backupUrl!;
    expect(backupUrl).toMatch(new RegExp(`^${cardUrl}\\.backup-.*\\.ttl$`, 'u'));
    expect(store.getRepresentation).toHaveBeenCalledWith({ path: cardUrl }, {});
    // The card is copied as-is: a broken card must still be backed up
    expect(store.setRepresentation).toHaveBeenCalledWith({ path: backupUrl }, backupRepresentation);
    // The backup is a normal resource of the pod: no authorization file is created for it
    expect(store.setRepresentation).not.toHaveBeenCalledWith({ path: `${backupUrl}.acl` }, expect.anything());
    expect(store.setRepresentation).not.toHaveBeenCalledWith({ path: `${backupUrl}.acr` }, expect.anything());
  });

  it('uses the content type of the card for the backup extension.', (): void => {
    expect((handler as any).getBackupExtension('text/turtle')).toBe('.ttl');
    expect((handler as any).getBackupExtension('application/ld+json')).toBe('.jsonld');
    expect((handler as any).getBackupExtension('text/n3')).toBe('.n3');
    expect((handler as any).getBackupExtension('image/png')).toBe('.bin');
  });

  it('backs up a JSON-LD card with a matching extension.', async(): Promise<void> => {
    const jsonLd = new BasicRepresentation('{"@id": "card"}', 'application/ld+json');
    store.getRepresentation.mockImplementation(async({ path }: any): Promise<any> => path === cardUrl ?
      jsonLd :
      new BasicRepresentation('acl data', 'text/turtle'));
    const response = await handler.handle({ accountId, json } as any);
    expect(response.json.backupUrl).toMatch(/\.jsonld$/u);
    expect(store.setRepresentation).toHaveBeenCalledWith({ path: response.json.backupUrl }, jsonLd);
  });

  it('does not overwrite an existing backup.', async(): Promise<void> => {
    store.hasResource.mockImplementation(async({ path }: any): Promise<boolean> =>
      path.includes('.backup-') ? !path.endsWith('-2.ttl') : resources.has(path));
    const response = await handler.handle({ accountId, json } as any);
    expect(response.json.backupUrl).toMatch(/-2\.ttl$/u);
    expect(backups()).toEqual([ response.json.backupUrl ]);
  });

  it('skips the backup if the card does not exist.', async(): Promise<void> => {
    resources.clear();
    const response = await handler.handle({ accountId, json } as any);
    expect(response.json).toEqual({
      webId,
      cardUrl,
      link: resource,
      oidcIssuer: baseUrl,
    });
    expect(response.json.backupUrl).toBeUndefined();
    expect(store.getRepresentation).not.toHaveBeenCalledWith({ path: cardUrl }, {});
    expect(backups()).toEqual([]);
  });

  it('notes a missing authorization template and leaves the authorization unchanged.', async(): Promise<void> => {
    resourcesGenerator.generate.mockImplementation(async function* (): AsyncGenerator<any, void, undefined> {
      yield {
        identifier: { path: `${podUrl}profile/card` },
        representation: new BasicRepresentation('new card', 'text/turtle'),
      };
    });
    const response = await handler.handle({ accountId, json } as any);
    expect(response.json.note).toContain('authorization');
    expect(store.setRepresentation).toHaveBeenCalledWith({ path: cardUrl }, expect.anything());
    expect(store.setRepresentation).not.toHaveBeenCalledWith({ path: aclUrl }, expect.anything());
  });

  it('aborts before touching the card if the backup fails.', async(): Promise<void> => {
    store.setRepresentation.mockImplementation(async({ path }: any): Promise<any> => {
      if (path.includes('.backup-')) {
        throw new Error('backup failure');
      }
      resources.add(path);
    });
    await expect(handler.handle({ accountId, json } as any)).rejects.toThrow('backup failure');
    expect(store.setRepresentation).not.toHaveBeenCalledWith({ path: cardUrl }, expect.anything());
  });

  it('propagates errors while writing the card.', async(): Promise<void> => {
    store.setRepresentation.mockImplementation(async({ path }: any): Promise<any> => {
      if (path === cardUrl) {
        throw new Error('card failure');
      }
      resources.add(path);
    });
    await expect(handler.handle({ accountId, json } as any)).rejects.toThrow('card failure');
  });

  it('throws an error if the templates do not generate the document of the WebID.', async(): Promise<void> => {
    const customWebId = `${podUrl}me#me`;
    webIdStore.findLinks.mockResolvedValue([{ id: linkId, webId: customWebId }]);
    json = { webId: customWebId, confirm: true };
    await expect(handler.handle({ accountId, json } as any)).rejects.toThrow(
      `The pod templates do not generate ${podUrl}me; this WebID cannot be recovered on this server.`,
    );
    expect(store.setRepresentation).toHaveBeenCalledTimes(0);
  });

  it('accepts a linked WebID without a fragment.', async(): Promise<void> => {
    webIdStore.findLinks.mockResolvedValue([{ id: linkId, webId: cardUrl }]);
    json = { webId: cardUrl, confirm: true };
    await expect(handler.handle({ accountId, json } as any)).resolves.toMatchObject({
      json: { webId: cardUrl, cardUrl },
    });
  });

  it('requires confirmation when it is explicitly false.', async(): Promise<void> => {
    json = { webId, confirm: false };
    await expect(handler.handle({ accountId, json } as any)).rejects.toThrow(
      `Set "confirm": true to replace ${cardUrl} and its authorization file` +
      ' and to back up the current profile document first.',
    );
  });

  it('does not mention a backup when there is no card to back up.', async(): Promise<void> => {
    resources.delete(cardUrl);
    json = { webId, confirm: false };
    await expect(handler.handle({ accountId, json } as any)).rejects.toThrow(
      `Set "confirm": true to replace ${cardUrl} and its authorization file.`,
    );
  });

  it('fails if no unique backup name can be found.', async(): Promise<void> => {
    store.hasResource.mockImplementation(async({ path }: any): Promise<boolean> =>
      path.includes('.backup-') ? true : resources.has(path));
    await expect(handler.handle({ accountId, json } as any)).rejects.toThrow(
      `Unable to create a unique backup name for ${cardUrl}.`,
    );
  });
});
