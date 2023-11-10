import {
  assertAccountId,
  parsePath,
  verifyAccountId,
} from '../../../../../../src/identity/interaction/account/util/AccountUtil';
import type { InteractionRoute } from '../../../../../../src/identity/interaction/routing/InteractionRoute';
import { InternalServerError } from '../../../../../../src/util/errors/InternalServerError';
import { NotFoundHttpError } from '../../../../../../src/util/errors/NotFoundHttpError';

describe('AccountUtil', (): void => {
  describe('#assertAccountId', (): void => {
    it('does nothing if the accountId is defined.', async(): Promise<void> => {
      expect(assertAccountId('id')).toBeUndefined();
    });

    it('throws an error if the accountId is undefined.', async(): Promise<void> => {
      expect((): void => assertAccountId()).toThrow(NotFoundHttpError);
    });
  });

  describe('#parsePath', (): void => {
    let route: jest.Mocked<InteractionRoute<'key'>>;

    beforeEach(async(): Promise<void> => {
      route = {
        matchPath: jest.fn().mockReturnValue({ key: 'value' }),
      } satisfies Partial<InteractionRoute<'key'>> as any;
    });

    it('returns the matching values.', async(): Promise<void> => {
      expect(parsePath(route, 'http://example.com/')).toEqual({ key: 'value' });
    });

    it('errors if the key was not found.', async(): Promise<void> => {
      route.matchPath.mockReturnValue(undefined);
      expect((): any => parsePath(route, 'http://example.com')).toThrow(InternalServerError);
    });
  });

  describe('#verifyAccountId', (): void => {
    it('does nothing if the values match.', async(): Promise<void> => {
      expect(verifyAccountId('id', 'id')).toBeUndefined();
    });

    it('throws an error if the values do not match.', async(): Promise<void> => {
      expect((): void => verifyAccountId('id', 'otherId')).toThrow(NotFoundHttpError);
    });
  });
});
