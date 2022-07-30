import { stringify } from 'querystring';
import { URL } from 'url';
import { Session } from '@inrupt/solid-client-authn-node';
import { load } from 'cheerio';
import type { Response } from 'cross-fetch';
import { fetch } from 'cross-fetch';
import type { Cookie } from 'set-cookie-parser';
import { parse, splitCookiesString } from 'set-cookie-parser';
import { APPLICATION_X_WWW_FORM_URLENCODED } from '../../src/util/ContentTypes';

/* eslint-disable jest/no-standalone-expect */
/**
 * Helper class to track the state while going through an IDP procedure
 * and generalizes several common calls and checks.
 */
export class IdentityTestState {
  private readonly baseUrl: string;
  private readonly redirectUrl: string;
  private readonly oidcIssuer: string;

  public readonly session: Session;
  private readonly cookies: Map<string, Cookie>;
  private cookie?: string;

  public constructor(baseUrl: string, redirectUrl: string, oidcIssuer: string) {
    this.baseUrl = baseUrl;
    this.redirectUrl = redirectUrl;
    this.oidcIssuer = oidcIssuer;
    this.session = new Session();
    this.cookies = new Map();
  }

  /**
   * Performs a fetch call while keeping track of the stored cookies and preventing redirects.
   * @param url - URL to call.
   * @param method - Method to use.
   * @param body - Body to send along.
   * @param contentType - Content-Type of the body.
   */
  public async fetchIdp(url: string, method = 'GET', body?: string, contentType?: string): Promise<Response> {
    const options = { method, headers: { cookie: this.cookie }, body, redirect: 'manual' } as any;
    if (contentType) {
      options.headers['content-type'] = contentType;
    }
    const res = await fetch(url, options);

    // Parse the cookies that need to be set and convert them to the corresponding header value
    // Make sure we don't overwrite cookies that were already present
    if (res.headers.get('set-cookie')) {
      const newCookies = parse(splitCookiesString(res.headers.get('set-cookie')!));
      for (const cookie of newCookies) {
        this.cookies.set(cookie.name, cookie);
      }
      // eslint-disable-next-line unicorn/prefer-spread
      this.cookie = Array.from(this.cookies, ([ , nom ]): string => `${nom.name}=${nom.value}`).join('; ');
    }
    return res;
  }

  /**
   * Uses the given jquery command to find a node in the given html body.
   * The value from the given attribute field then gets extracted and combined with the base url.
   * @param html - Body to parse.
   * @param jquery - Query to run on the body.
   * @param attr - Attribute to extract.
   */
  public extractUrl(html: string, jquery: string, attr: string): string {
    const url = load(html)(jquery).attr(attr);
    expect(typeof url).toBe('string');
    return new URL(url!, this.baseUrl).href;
  }

  /**
   * Initializes an authentication session and stores the relevant cookies for later re-use.
   * All te relevant links from the login page get extracted.
   */
  public async startSession(clientId?: string): Promise<string> {
    let nextUrl = '';
    await this.session.login({
      redirectUrl: this.redirectUrl,
      oidcIssuer: this.oidcIssuer,
      clientId,
      handleRedirect(data): void {
        nextUrl = data;
      },
    });
    expect(nextUrl.length > 0).toBeTruthy();
    expect(nextUrl.startsWith(this.oidcIssuer)).toBeTruthy();

    // Need to catch the redirect so we can copy the cookies
    let res = await this.fetchIdp(nextUrl);
    expect(res.status).toBe(303);
    nextUrl = res.headers.get('location')!;

    // Handle redirect
    res = await this.fetchIdp(nextUrl);
    expect(res.status).toBe(200);

    // Need to send request to prompt API to get actual location
    let json = await res.json();
    res = await this.fetchIdp(json.controls.prompt);
    json = await res.json();
    nextUrl = json.location;

    return nextUrl;
  }

  /**
   * Logs in by sending the corresponding email and password to the given form action.
   * The URL should be extracted from the login page.
   */
  public async login(url: string, email: string, password: string): Promise<string> {
    const formData = stringify({ email, password });
    let res = await this.fetchIdp(url, 'POST', formData, APPLICATION_X_WWW_FORM_URLENCODED);
    expect(res.status).toBe(200);
    const json = await res.json();
    res = await this.fetchIdp(json.location);
    expect(res.status).toBe(303);
    return res.headers.get('location')!;
  }

  /**
   * Triggers the options for the switch account UI
   */
  public async switchAccount(
    url: string, continueWithCurrentLogin: boolean, email?: string, password?: string,
  ): Promise<string> {
    let formData: string;
    if (continueWithCurrentLogin) {
      formData = stringify({ continueWithCurrentLogin: 'true' });
    } else if (!continueWithCurrentLogin && email && password) {
      formData = stringify({ continueWithCurrentLogin: 'false', email, password });
    } else {
      throw new Error('An email or password must be provided if continueWithCurrentLogin is false');
    }
    let res = await this.fetchIdp(url, 'POST', formData, APPLICATION_X_WWW_FORM_URLENCODED);
    expect(res.status).toBe(200);
    const json = await res.json();
    res = await this.fetchIdp(json.location);
    expect(res.status).toBe(303);
    return res.headers.get('location')!;
  }

  /**
   * Handles the consent screen at the given URL and the followup redirect back to the client.
   */
  public async consent(url: string): Promise<void> {
    let res = await this.fetchIdp(url, 'POST', '', APPLICATION_X_WWW_FORM_URLENCODED);
    expect(res.status).toBe(200);
    const json = await res.json();

    res = await this.fetchIdp(json.location);
    expect(res.status).toBe(303);
    const mockUrl = res.headers.get('location')!;
    expect(mockUrl.startsWith(this.redirectUrl)).toBeTruthy();

    const info = await this.session.handleIncomingRedirect(mockUrl);
    expect(info?.isLoggedIn).toBe(true);
  }
}
