import { stringify } from 'querystring';
import { URL } from 'url';
import { Session } from '@inrupt/solid-client-authn-node';
import { load } from 'cheerio';
import type { Response } from 'cross-fetch';
import { fetch } from 'cross-fetch';
import { parse, splitCookiesString } from 'set-cookie-parser';
import { APPLICATION_X_WWW_FORM_URLENCODED } from '../../src/util/ContentTypes';

/* eslint-disable jest/no-standalone-expect */
/**
 * Helper class to track the state while going through an Idp procedure
 * and generalizes several common calls and checks.
 */
export class IdentityTestState {
  private readonly baseUrl: string;
  private readonly redirectUrl: string;
  private readonly oidcIssuer: string;

  public readonly session: Session;
  public cookie?: string;

  public constructor(baseUrl: string, redirectUrl: string, oidcIssuer: string) {
    this.baseUrl = baseUrl;
    this.redirectUrl = redirectUrl;
    this.oidcIssuer = oidcIssuer;
    this.session = new Session();
  }

  /**
   * Performs a fetch call while keeping track of the stored cookies and preventing redirects.
   * @param url - URL to call.
   * @param method - Method to use.
   * @param body - Body to send along.
   * @param contentType - Content-Type of the body.
   */
  // eslint-disable-next-line default-param-last
  public async fetchIdp(url: string, method = 'GET', body?: string, contentType?: string): Promise<Response> {
    const options = { method, headers: { cookie: this.cookie }, body, redirect: 'manual' } as any;
    if (contentType) {
      options.headers['content-type'] = contentType;
    }
    return fetch(url, options);
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
  public async startSession(): Promise<{ register: string; login: string; forgotPassword: string }> {
    let nextUrl = '';
    await this.session.login({
      redirectUrl: this.redirectUrl,
      oidcIssuer: this.oidcIssuer,
      handleRedirect(data): void {
        nextUrl = data;
      },
    });
    expect(nextUrl.length > 0).toBeTruthy();
    expect(nextUrl.startsWith(this.oidcIssuer)).toBeTruthy();

    // Need to catch the redirect so we can copy the cookies
    let res = await this.fetchIdp(nextUrl);
    expect(res.status).toBe(302);
    nextUrl = res.headers.get('location')!;

    // Parse the cookies that need to be set and convert them to the corresponding header value
    const cookies = parse(splitCookiesString(res.headers.get('set-cookie') ?? ''));
    this.cookie = cookies.map((nom): string => `${nom.name}=${nom.value}`).join('; ');

    // Find all the actions on the login page
    res = await this.fetchIdp(nextUrl);
    expect(res.status).toBe(200);
    const text = await res.text();
    const register = this.extractUrl(text, 'a:contains("Register")', 'href');
    const login = this.extractUrl(text, 'form', 'action');
    const forgotPassword = this.extractUrl(text, 'a:contains("Forgot Password")', 'href');

    return { register, login, forgotPassword };
  }

  /**
   * Logs in by sending the corresponding email and password to the given form action.
   * The URL should be extracted from the login page.
   */
  public async login(url: string, email: string, password: string): Promise<void> {
    const formData = stringify({ email, password });
    const res = await this.fetchIdp(url, 'POST', formData, APPLICATION_X_WWW_FORM_URLENCODED);
    expect(res.status).toBe(302);
    const nextUrl = res.headers.get('location')!;

    return this.handleLoginRedirect(nextUrl);
  }

  /**
   * Calls the given URL and extracts the action URL from a form contained within the resulting body.
   * Also returns the resulting body in case further parsing is needed.
   */
  public async extractFormUrl(url: string): Promise<{ url: string; body: string }> {
    const res = await this.fetchIdp(url);
    expect(res.status).toBe(200);
    const text = await res.text();
    const formUrl = this.extractUrl(text, 'form', 'action');
    return {
      url: new URL(formUrl, this.baseUrl).href,
      body: text,
    };
  }

  /**
   * Handles the redirect that happens after logging in.
   */
  public async handleLoginRedirect(url: string): Promise<void> {
    const res = await this.fetchIdp(url);
    expect(res.status).toBe(302);
    const mockUrl = res.headers.get('location')!;
    expect(mockUrl.startsWith(this.redirectUrl)).toBeTruthy();

    const info = await this.session.handleIncomingRedirect(mockUrl);
    expect(info?.isLoggedIn).toBe(true);
  }
}
