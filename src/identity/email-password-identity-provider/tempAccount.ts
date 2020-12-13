import type { KoaContextWithOIDC } from 'oidc-provider';
import { v4 } from 'uuid';

const store = new Map();
const logins = new Map();

interface IProfile {
  accountId: string;
}

interface IClaims {
  webid: string;
  sub: string;
}

export default class Account {
  public accountId: string;
  public profile?: IProfile;

  public constructor(id: string, profile?: IProfile) {
    this.accountId = id || v4();
    this.profile = profile;
    store.set(this.accountId, this);
  }

  /**
   * @param use - can either be "id_token" or "userinfo", depending on
   *   where the specific claims are intended to be put in.
   * @param scope - the intended scope, while oidc-provider will mask
   *   claims depending on the scope automatically you might want to skip
   *   loading some claims from external resources etc. based on this detail
   *   or not return them in id tokens but only userinfo and so on.
   */
  // These are the params: use: "id_token" | "userinfo", scope, claims, rejected
  public async claims(): Promise<IClaims> {
    // TODO [>1.0.0] Add more complicated claims
    // if (this.profile) {
    //   return {
    //     sub: this.accountId, // it is essential to always return a sub claim
    //     email: this.profile.email,
    //     email_verified: this.profile.email_verified,
    //     family_name: this.profile.family_name,
    //     given_name: this.profile.given_name,
    //     locale: this.profile.locale,
    //     name: this.profile.name,
    //   };
    // }

    return {
      sub: this.accountId,
      webid: 'https://jackson.solidcommunity.net/profile/card#me',
    };
  }

  public static async findByLogin(login: string): Promise<IProfile> {
    if (!logins.get(login)) {
      logins.set(login, new Account(login));
    }

    return logins.get(login);
  }

  public static async findAccount(ctx: KoaContextWithOIDC, sub: string): Promise<Account | undefined> {
    // Token is a reference to the token used for which a given account is being loaded,
    // it is undefined in scenarios where account claims are returned from authorization endpoint
    // ctx is the koa request context
    if (!store.get(sub)) {
      // eslint-disable-next-line no-new
      return new Account(sub);
    }
    return store.get(sub);
  }
}
