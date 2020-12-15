/* eslint-disable @typescript-eslint/naming-convention */
const store = new Map();
const logins = new Map();
import { v4 } from 'uuid';

interface IProfile {
  email: string;
  email_verified: boolean;
  family_name: string;
  given_name: string;
  locale: string;
  name: string;
}

type IClaims = Record<string, unknown> & { sub: string };

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
  public async claims(): Promise<IClaims> {
    // eslint-disable-line no-unused-vars
    if (this.profile) {
      return {
        // It is essential to always return a sub claim
        sub: this.accountId,
        email: this.profile.email,
        email_verified: this.profile.email_verified,
        family_name: this.profile.family_name,
        given_name: this.profile.given_name,
        locale: this.profile.locale,
        name: this.profile.name,
      };
    }

    return {
      // It is essential to always return a sub claim
      sub: this.accountId,
      address: {
        country: '000',
        formatted: '000',
        locality: '000',
        postal_code: '000',
        region: '000',
        street_address: '000',
      },
      birthdate: '1987-10-16',
      email: 'johndoe@example.com',
      email_verified: false,
      family_name: 'Doe',
      gender: 'male',
      given_name: 'John',
      locale: 'en-US',
      middle_name: 'Middle',
      name: 'John Doe',
      nickname: 'Johny',
      phone_number: '+49 000 000000',
      phone_number_verified: false,
      picture: 'http://lorempixel.com/400/200/',
      preferred_username: 'johnny',
      profile: 'https://johnswebsite.com',
      updated_at: 1454704946,
      website: 'http://example.com',
      zoneinfo: 'Europe/Berlin',
    };
  }

  public static async findByFederated(provider: string, claims: IProfile & IClaims): Promise<Account> {
    const id = `${provider}.${claims.sub}`;
    if (!logins.get(id)) {
      logins.set(id, new Account(id, claims));
    }
    return logins.get(id);
  }

  public static async findByLogin(login: string): Promise<Account> {
    if (!logins.get(login)) {
      logins.set(login, new Account(login));
    }

    return logins.get(login);
  }

  public static async findAccount(ctx: any, id: string): Promise<Account> {
    // eslint-disable-line no-unused-vars
    // token is a reference to the token used for which a given account is being loaded,
    //   it is undefined in scenarios where account claims are returned from authorization endpoint
    // ctx is the koa request context
    if (!store.get(id)) {
      // eslint-disable-next-line no-new
      new Account(id);
    }
    return store.get(id);
  }
}
