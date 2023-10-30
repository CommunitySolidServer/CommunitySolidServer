import { CreatePodHandler } from '../../../../../src/identity/interaction/pod/CreatePodHandler';
import type { PodIdRoute } from '../../../../../src/identity/interaction/pod/PodIdRoute';
import type { PodCreator } from '../../../../../src/identity/interaction/pod/util/PodCreator';
import type { PodStore } from '../../../../../src/identity/interaction/pod/util/PodStore';
import type { WebIdLinkRoute } from '../../../../../src/identity/interaction/webid/WebIdLinkRoute';

describe('A CreatePodHandler', (): void => {
  const name = 'name';
  const webId = 'http://example.com/other/webId#me';
  const accountId = 'accountId';
  const podId = 'podId';
  const webIdLink = 'webIdLink';
  let json: unknown;
  const podUrl = 'http://example.com/name/';
  const webIdResource = 'http://example.com/.account/webID';
  const podResource = 'http://example.com/.account/pod';
  let webIdLinkRoute: jest.Mocked<WebIdLinkRoute>;
  let podIdRoute: jest.Mocked<PodIdRoute>;
  let podStore: jest.Mocked<PodStore>;
  let podCreator: jest.Mocked<PodCreator>;
  let handler: CreatePodHandler;

  beforeEach(async(): Promise<void> => {
    json = {
      name,
    };

    podCreator = {
      handleSafe: jest.fn().mockResolvedValue({ podUrl, podId, webId, webIdLink }),
    } satisfies Partial<PodCreator> as any;

    podStore = {
      create: jest.fn().mockResolvedValue(podId),
      findPods: jest.fn().mockResolvedValue([{ id: podId, baseUrl: podUrl }]),
    } satisfies Partial<PodStore> as any;

    webIdLinkRoute = {
      getPath: jest.fn().mockReturnValue(webIdResource),
      matchPath: jest.fn(),
    };

    podIdRoute = {
      getPath: jest.fn().mockReturnValue(podResource),
      matchPath: jest.fn(),
    };

    handler = new CreatePodHandler(podStore, podCreator, webIdLinkRoute, podIdRoute);
  });

  it('returns the required input fields and known pods.', async(): Promise<void> => {
    await expect(handler.getView({ accountId } as any)).resolves.toEqual({
      json: {
        pods: {
          [podUrl]: podResource,
        },
        fields: {
          name: { required: true, type: 'string' },
          settings: {
            required: false,
            type: 'object',
            fields: { webId: { required: false, type: 'string' }},
          },
        },
      },
    });

    expect(podStore.findPods).toHaveBeenCalledTimes(1);
    expect(podStore.findPods).toHaveBeenLastCalledWith(accountId);
  });

  it('generates a pod and WebID.', async(): Promise<void> => {
    await expect(handler.handle({ json, accountId } as any)).resolves.toEqual({
      json: { pod: podUrl, webId, podResource, webIdResource },
    });
    expect(podCreator.handleSafe).toHaveBeenCalledTimes(1);
    expect(podCreator.handleSafe).toHaveBeenLastCalledWith({ accountId, name, settings: {}});
  });

  it('generates a pod with a WebID if there is one.', async(): Promise<void> => {
    const settings = { webId };
    json = { name, settings };
    await expect(handler.handle({ json, accountId } as any)).resolves.toEqual({
      json: { pod: podUrl, webId, podResource, webIdResource },
    });
    expect(podCreator.handleSafe).toHaveBeenCalledTimes(1);
    expect(podCreator.handleSafe).toHaveBeenLastCalledWith({ accountId, name, webId, settings });
  });

  describe('allowing root pods', (): void => {
    beforeEach(async(): Promise<void> => {
      handler = new CreatePodHandler(podStore, podCreator, webIdLinkRoute, podIdRoute, true);
    });

    it('does not require a name.', async(): Promise<void> => {
      await expect(handler.getView({ accountId } as any)).resolves.toEqual({
        json: {
          pods: {
            [podUrl]: podResource,
          },
          fields: {
            name: { required: false, type: 'string' },
            settings: {
              required: false,
              type: 'object',
              fields: { webId: { required: false, type: 'string' }},
            },
          },
        },
      });
    });
  });
});
