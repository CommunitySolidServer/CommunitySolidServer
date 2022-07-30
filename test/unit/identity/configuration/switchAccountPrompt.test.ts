import type { KoaContextWithOIDC } from 'oidc-provider';
import { switchAccountCheckCallback } from '../../../../src/identity/configuration/switchAccountPrompt';

describe('switchAccountPrompt', (): void => {
  it('prompts if the user is logged in and hasn\'t been prompted.', async(): Promise<void> => {
    const ctx: KoaContextWithOIDC = ({
      oidc: {
        session: {
          authorizations: {},
        },
      },
    }) as KoaContextWithOIDC;
    expect(await switchAccountCheckCallback(ctx)).toBe(true);
  });

  it('doesn\'t prompt if the user is not logged in and hasn\'t been prompted.', async(): Promise<void> => {
    const ctx: KoaContextWithOIDC = ({
      oidc: {},
    }) as KoaContextWithOIDC;
    expect(await switchAccountCheckCallback(ctx)).toBe(false);
  });

  it('doesn\'t prompt if the user is logged in and has been prompted.', async(): Promise<void> => {
    const ctx: KoaContextWithOIDC = ({
      oidc: {
        session: {
          authorizations: {},
        },
        result: {
          hasAskedToSwitchAccount: true,
        },
      },
    }) as unknown as KoaContextWithOIDC;
    expect(await switchAccountCheckCallback(ctx)).toBe(false);
  });
});
