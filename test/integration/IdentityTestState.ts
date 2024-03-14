import { Session } from '@inrupt/solid-client-authn-node';
import type { Response } from 'cross-fetch';
import { fetch } from 'cross-fetch';
import type { Cookie } from 'set-cookie-parser';
import { parse, splitCookiesString } from 'set-cookie-parser';

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
   *
   * @param url - URL to call.
   * @param method - Method to use.
   * @param body - Body to send along. If this is not a string it will be JSONified.
   * @param contentType - Content-Type of the body. If not defined but there is a body, this will be set to JSON.
   */
  public async fetchIdp(url: string, method = 'GET', body?: string | unknown, contentType?: string): Promise<Response> {
    const options = { method, headers: { cookie: this.cookie }, body, redirect: 'manual' } as any;
    if (body && typeof body !== 'string') {
      options.body = JSON.stringify(body);
    }
    if (body && !contentType) {
      contentType = 'application/json';
    }
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
      this.cookie = Array.from(this.cookies, ([ , nom ]): string => `${nom.name}=${nom.value}`).join('; ');
    }
    return res;
  }

  /**
   * Initializes the OIDC session for the given clientId.
   * If undefined, dynamic registration will be used.
   */
  public async initSession(clientId?: string): Promise<string> {
    let nextUrl: string;
    await this.session.login({
      redirectUrl: this.redirectUrl,
      oidcIssuer: this.oidcIssuer,
      clientId,
      handleRedirect(data): void {
        nextUrl = data;
      },
    });
    return nextUrl!;
  }

  /**
   * Handles a URL that is expected to redirect and returns the target it would redirect to.
   */
  public async handleRedirect(url: string): Promise<string> {
    const res = await this.fetchIdp(url);
    expect(res.status).toBe(303);
    expect(res.headers.has('location')).toBe(true);
    return res.headers.get('location')!;
  }

  /**
   * Handles a JSON redirect. That is a request that returns a 200,
   * but has a `location` field in the JSON to indicate what it should redirect to.
   * That URL is expected to be another redirect, and this returns what it would redirect to.
   */
  public async handleLocationRedirect(res: Response): Promise<string> {
    expect(res.status).toBe(200);
    const json = await res.json();
    // The OIDC redirect
    expect(json.location).toBeDefined();

    return this.handleRedirect(json.location);
  }

  public async handleIncomingRedirect(res: Response, webId: string): Promise<void> {
    // Redirect back to the client
    const url = await this.handleLocationRedirect(res);
    expect(url.startsWith(this.redirectUrl)).toBe(true);

    const info = await this.session.handleIncomingRedirect(url);
    expect(info?.isLoggedIn).toBe(true);
    expect(info?.webId).toBe(webId);
  }
}
