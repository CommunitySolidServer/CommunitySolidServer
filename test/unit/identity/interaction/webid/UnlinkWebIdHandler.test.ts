import { UnlinkWebIdHandler } from '../../../../../src/identity/interaction/webid/UnlinkWebIdHandler';
import type { WebIdStore } from '../../../../../src/identity/interaction/webid/util/WebIdStore';
import type { WebIdLinkRoute } from '../../../../../src/identity/interaction/webid/WebIdLinkRoute';
import { NotFoundHttpError } from '../../../../../src/util/errors/NotFoundHttpError';

describe('A UnlinkWebIdHandler', (): void => {
  const id = 'link';
  const target = { path: 'http://example.com/.account/link' };
  const webId = 'http://example.com/.account/card#me';
  const accountId = 'accountId';
  let store: jest.Mocked<WebIdStore>;
  let route: jest.Mocked<WebIdLinkRoute>;
  let handler: UnlinkWebIdHandler;

  beforeEach(async(): Promise<void> => {
    store = {
      get: jest.fn().mockResolvedValue({ accountId, webId }),
      delete: jest.fn(),
    } satisfies Partial<WebIdStore> as any;

    route = {
      getPath: jest.fn(),
      matchPath: jest.fn().mockReturnValue({ accountId, webIdLink: id }),
    };

    handler = new UnlinkWebIdHandler(store, route);
  });

  it('removes the WebID link.', async(): Promise<void> => {
    await expect(handler.handle({ target, accountId } as any)).resolves.toEqual({ json: {}});
    expect(store.delete).toHaveBeenCalledTimes(1);
    expect(store.delete).toHaveBeenLastCalledWith(id);
  });

  it('throws a 404 if the authenticated accountId is not the owner.', async(): Promise<void> => {
    await expect(handler.handle({ target, accountId: 'otherId' } as any)).rejects.toThrow(NotFoundHttpError);
    expect(store.get).toHaveBeenCalledTimes(1);
    expect(store.get).toHaveBeenLastCalledWith(id);
    expect(store.delete).toHaveBeenCalledTimes(0);
  });
});
