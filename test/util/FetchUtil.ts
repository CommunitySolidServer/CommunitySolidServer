import 'jest-rdf';
import type { Response } from 'cross-fetch';
import fetch from 'cross-fetch';
import type { Quad } from 'n3';
import { Parser } from 'n3';
import { isContainerPath } from '../../src/util/PathUtil';
import { LDP } from '../../src/util/Vocabularies';

/**
 * This is specifically for GET requests which are expected to succeed.
 */
export async function getResource(
  url: string,
  options?: { accept?: string },
  expected?: { contentType?: string },
): Promise<Response> {
  const isContainer = isContainerPath(url);
  const response = await fetch(url, { headers: options });
  expect(response.status).toBe(200);
  expect(response.headers.get('link')).toContain(`<${LDP.Resource}>; rel="type"`);
  expect(response.headers.get('link')).toContain(`<${url}.acl>; rel="acl"`);

  if (isContainer) {
    expect(response.headers.get('link')).toContain(`<${LDP.Container}>; rel="type"`);
    expect(response.headers.get('link')).toContain(`<${LDP.BasicContainer}>; rel="type"`);
  } else {
    expect(response.headers.get('accept-patch')).toBe('text/n3, application/sparql-update');
  }
  if (expected?.contentType) {
    expect(response.headers.get('content-type')).toBe(expected.contentType);
  } else if (isContainer) {
    expect(response.headers.get('content-type')).toBe('text/turtle');
  }

  return response;
}

/**
 * This is specifically for PUT requests which are expected to succeed.
 */
export async function putResource(url: string, options: { contentType: string; body?: string; exists?: boolean }):
Promise<Response> {
  const init: RequestInit = {
    method: 'PUT',
    headers: { 'content-type': options.contentType },
    body: options.body,
  };
  if (isContainerPath(url)) {
    (init.headers as Record<string, string>).link = '<http://www.w3.org/ns/ldp#Container>; rel="type"';
  }
  const response = await fetch(url, init);
  expect(response.status).toBe(options.exists ? 205 : 201);
  if (!options.exists) {
    expect(response.headers.get('location')).toBe(url);
  }
  await expect(response.text()).resolves.toHaveLength(0);
  return response;
}

export type CreateOptions = {
  contentType: string;
  isContainer?: boolean;
  slug?: string;
  body?: string;
};
/**
 * This is specifically for POST requests which are expected to succeed.
 */
export async function postResource(container: string, options: CreateOptions): Promise<Response> {
  const init: RequestInit = {
    method: 'POST',
    headers: { 'content-type': options.contentType },
    body: options.body,
  };
  if (options.isContainer) {
    (init.headers as Record<string, string>).link = '<http://www.w3.org/ns/ldp#Container>; rel="type"';
  }
  if (options.slug) {
    (init.headers as Record<string, string>).slug = options.slug;
  }
  const response = await fetch(container, init);
  await expect(response.text()).resolves.toHaveLength(0);
  expect(response.status).toBe(201);
  const regex = new RegExp(`^${container}[^/]+${options.isContainer ? '/' : ''}`, 'u');
  expect(response.headers.get('location')).toMatch(regex);
  return response;
}

/**
 * This is specifically for PATCH requests which are expected to succeed.
 */
export async function patchResource(url: string, query: string, type: 'sparql' | 'n3', exists?: boolean):
Promise<Response> {
  const contentTypes = { sparql: 'application/sparql-update', n3: 'text/n3' };
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'content-type': contentTypes[type],
    },
    body: query,
  });
  await expect(response.text()).resolves.toHaveLength(0);
  expect(response.status).toBe(exists ? 205 : 201);
  if (!exists) {
    expect(response.headers.get('location')).toBe(url);
  }

  return response;
}

export async function deleteResource(url: string): Promise<void> {
  let response = await fetch(url, { method: 'DELETE' });
  expect(response.status).toBe(205);
  response = await fetch(url);
  expect(response.status).toBe(404);
}

/**
 * Verifies if the body of the given Response contains the expected Quads.
 * If `exact` is true, a 1-to-1 match is expected, if not, the expected quads should be a subset of the body.
 */
export async function expectQuads(response: Response, expected: Quad[], exact?: boolean): Promise<void> {
  const parser = new Parser({ baseIRI: response.url });
  const quads = parser.parse(await response.text());
  if (exact) {
    expect(quads).toBeRdfIsomorphic(expected);
  } else {
    for (const expectedQuad of expected) {
      expect(quads.some((entry): boolean => entry.equals(expectedQuad))).toBe(true);
    }
  }
}
