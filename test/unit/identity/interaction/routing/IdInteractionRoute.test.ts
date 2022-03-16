import { IdInteractionRoute } from '../../../../../src/identity/interaction/routing/IdInteractionRoute';
import type { InteractionRoute } from '../../../../../src/identity/interaction/routing/InteractionRoute';
import { InternalServerError } from '../../../../../src/util/errors/InternalServerError';

describe('An IdInteractionRoute', (): void => {
  const idName = 'id';
  let base: jest.Mocked<InteractionRoute<'base'>>;
  let route: IdInteractionRoute<'base', 'id'>;

  beforeEach(async(): Promise<void> => {
    base = {
      getPath: jest.fn().mockReturnValue('http://example.com/'),
      matchPath: jest.fn().mockReturnValue({ base: 'base' }),
    };

    route = new IdInteractionRoute<'base', 'id'>(base, idName);
  });

  describe('#getPath', (): void => {
    it('appends the identifier value to generate the path.', async(): Promise<void> => {
      expect(route.getPath({ base: 'base', id: '12345' })).toBe('http://example.com/12345/');
    });

    it('errors if there is no input identifier.', async(): Promise<void> => {
      expect((): string => route.getPath({ base: 'base' } as any)).toThrow(InternalServerError);
    });

    it('can be configured not to add a slash at the end.', async(): Promise<void> => {
      route = new IdInteractionRoute<'base', 'id'>(base, idName, false);
      expect(route.getPath({ base: 'base', id: '12345' })).toBe('http://example.com/12345');
    });
  });

  describe('#matchPath', (): void => {
    it('returns the matching values.', async(): Promise<void> => {
      expect(route.matchPath('http://example.com/1234/')).toEqual({ base: 'base', id: '1234' });
    });

    it('returns undefined if there is no match.', async(): Promise<void> => {
      expect(route.matchPath('http://example.com/1234')).toBeUndefined();
    });

    it('returns undefined if there is no base match.', async(): Promise<void> => {
      base.matchPath.mockReturnValueOnce(undefined);
      expect(route.matchPath('http://example.com/1234/')).toBeUndefined();
    });
  });
});
