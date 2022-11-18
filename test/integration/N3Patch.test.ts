import 'jest-rdf';
import { fetch } from 'cross-fetch';
import { Parser } from 'n3';
import type { AclPermissionSet } from '../../src/authorization/permissions/AclPermissionSet';
import { BasicRepresentation } from '../../src/http/representation/BasicRepresentation';
import type { App } from '../../src/init/App';
import type { ResourceStore } from '../../src/storage/ResourceStore';
import { joinUrl } from '../../src/util/PathUtil';
import { AclHelper } from '../util/AclHelper';
import { getPort } from '../util/Util';
import {
  getDefaultVariables,
  getPresetConfigPath,
  getTestConfigPath,
  instantiateFromConfig,
} from './Config';

const port = getPort('N3Patch');
const baseUrl = `http://localhost:${port}/`;

let store: ResourceStore;
let aclHelper: AclHelper;

async function expectPatch(
  input: { path: string; contentType?: string; body: string },
  expected: { status: number; message?: string; turtle?: string },
): Promise<void> {
  const message = expected.message ?? '';
  const contentType = input.contentType ?? 'text/n3';

  const body = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
  ${input.body}`;

  const url = joinUrl(baseUrl, input.path);
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'content-type': contentType },
    body,
  });
  await expect(res.text()).resolves.toContain(message);
  expect(res.status).toBe(expected.status);

  // Verify if the resource has the expected RDF data
  if (expected.turtle) {
    // Might not have read permissions so need to update
    await aclHelper.setSimpleAcl(url, { permissions: { read: true }, agentClass: 'agent', accessTo: true });
    const get = await fetch(url, {
      method: 'GET',
      headers: { accept: 'text/turtle' },
    });
    const expectedTurtle = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
    ${expected.turtle}`;

    expect(get.status).toBe(200);
    const parser = new Parser({ format: 'text/turtle', baseIRI: url });
    const actualTriples = parser.parse(await get.text());
    expect(actualTriples).toBeRdfIsomorphic(parser.parse(expectedTurtle));
  }
}

// Creates/updates a resource with the given data and permissions
async function setResource(path: string, turtle: string, permissions: AclPermissionSet): Promise<void> {
  const url = joinUrl(baseUrl, path);
  await store.setRepresentation({ path: url }, new BasicRepresentation(turtle, 'text/turtle'));
  await aclHelper.setSimpleAcl(url, { permissions, agentClass: 'agent', accessTo: true });
}

describe('A Server supporting N3 Patch', (): void => {
  let app: App;

  beforeAll(async(): Promise<void> => {
    // Create and start the server
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      [
        getPresetConfigPath('storage/backend/memory.json'),
        getTestConfigPath('ldp-with-auth.json'),
      ],
      getDefaultVariables(port, baseUrl),
    ) as Record<string, any>;
    ({ app, store } = instances);

    await app.start();

    // Create test helper for manipulating acl
    aclHelper = new AclHelper(store);
  });

  afterAll(async(): Promise<void> => {
    await app.stop();
  });

  describe('with an invalid patch document', (): void => {
    it('requires text/n3 content-type.', async(): Promise<void> => {
      await expectPatch(
        { path: '/invalid', contentType: 'text/other', body: '' },
        { status: 415 },
      );
    });

    it('requires valid syntax.', async(): Promise<void> => {
      await expectPatch(
        { path: '/invalid', body: 'invalid syntax' },
        { status: 400, message: 'Invalid N3' },
      );
    });

    it('requires a solid:InsertDeletePatch.', async(): Promise<void> => {
      await expectPatch(
        { path: '/invalid', body: '<> a solid:Patch.' },
        {
          status: 422,
          message: 'This patcher only supports N3 Patch documents with exactly 1 solid:InsertDeletePatch entry',
        },
      );
    });
  });

  describe('inserting data', (): void => {
    it('succeeds if there is no resource.', async(): Promise<void> => {
      await expectPatch(
        { path: '/new-insert', body: `<> a solid:InsertDeletePatch; solid:inserts { <x> <y> <z>. }.` },
        { status: 201, turtle: '<x> <y> <z>.' },
      );
    });

    it('fails if there is only read access.', async(): Promise<void> => {
      await setResource('/read-only', '<a> <b> <c>.', { read: true });
      await expectPatch(
        { path: '/read-only', body: `<> a solid:InsertDeletePatch; solid:inserts { <x> <y> <z>. }.` },
        { status: 401 },
      );
    });

    it('succeeds if there is only read access.', async(): Promise<void> => {
      await setResource('/append-only', '<a> <b> <c>.', { append: true });
      await expectPatch(
        { path: '/append-only', body: `<> a solid:InsertDeletePatch; solid:inserts { <x> <y> <z>. }.` },
        { status: 205, turtle: '<a> <b> <c>. <x> <y> <z>.' },
      );
    });

    it('succeeds if there is only write access.', async(): Promise<void> => {
      await setResource('/write-only', '<a> <b> <c>.', { write: true });
      await expectPatch(
        { path: '/write-only', body: `<> a solid:InsertDeletePatch; solid:inserts { <x> <y> <z>. }.` },
        { status: 205, turtle: '<a> <b> <c>. <x> <y> <z>.' },
      );
    });
  });

  describe('inserting conditional data', (): void => {
    it('fails if there is no resource.', async(): Promise<void> => {
      await expectPatch(
        { path: '/new-insert-where', body: `<> a solid:InsertDeletePatch;
                 solid:inserts { ?a <y> <z>. };
                 solid:where   { ?a <b> <c>. }.` },
        { status: 409, message: 'The document does not contain any matches for the N3 Patch solid:where condition.' },
      );
    });

    it('fails if there is only read access.', async(): Promise<void> => {
      await setResource('/read-only', '<a> <b> <c>.', { read: true });
      await expectPatch(
        { path: '/read-only', body: `<> a solid:InsertDeletePatch;
                 solid:inserts { ?a <y> <z>. };
                 solid:where   { ?a <b> <c>. }.` },
        { status: 401 },
      );
    });

    it('fails if there is only append access.', async(): Promise<void> => {
      await setResource('/append-only', '<a> <b> <c>.', { append: true });
      await expectPatch(
        { path: '/append-only', body: `<> a solid:InsertDeletePatch;
                 solid:inserts { ?a <y> <z>. };
                 solid:where   { ?a <b> <c>. }.` },
        { status: 401 },
      );
    });

    it('fails if there is only write access.', async(): Promise<void> => {
      await setResource('/write-only', '<a> <b> <c>.', { write: true });
      await expectPatch(
        { path: '/write-only', body: `<> a solid:InsertDeletePatch;
                 solid:inserts { ?a <y> <z>. };
                 solid:where   { ?a <b> <c>. }.` },
        { status: 401 },
      );
    });

    describe('with read/append access', (): void => {
      it('succeeds if the conditions match.', async(): Promise<void> => {
        await setResource('/read-append', '<a> <b> <c>.', { read: true, append: true });
        await expectPatch(
          { path: '/read-append', body: `<> a solid:InsertDeletePatch;
                 solid:inserts { ?a <y> <z>. };
                 solid:where   { ?a <b> <c>. }.` },
          { status: 205, turtle: '<a> <b> <c>. <a> <y> <z>.' },
        );
      });

      it('rejects if there is no match.', async(): Promise<void> => {
        await setResource('/read-append', '<a> <b> <c>.', { read: true, append: true });
        await expectPatch(
          { path: '/read-append', body: `<> a solid:InsertDeletePatch;
                 solid:inserts { ?a <y> <z>. };
                 solid:where   { ?a <y> <z>. }.` },
          { status: 409, message: 'The document does not contain any matches for the N3 Patch solid:where condition.' },
        );
      });

      it('rejects if there are multiple matches.', async(): Promise<void> => {
        await setResource('/read-append', '<a> <b> <c>. <c> <b> <c>.', { read: true, append: true });
        await expectPatch(
          { path: '/read-append', body: `<> a solid:InsertDeletePatch;
                 solid:inserts { ?a <y> <z>. };
                 solid:where   { ?a <b> <c>. }.` },
          { status: 409, message: 'The document contains multiple matches for the N3 Patch solid:where condition' },
        );
      });
    });

    describe('with read/write access', (): void => {
      it('succeeds if the conditions match.', async(): Promise<void> => {
        await setResource('/read-write', '<a> <b> <c>.', { read: true, write: true });
        await expectPatch(
          { path: '/read-write', body: `<> a solid:InsertDeletePatch;
                 solid:inserts { ?a <y> <z>. };
                 solid:where   { ?a <b> <c>. }.` },
          { status: 205, turtle: '<a> <b> <c>. <a> <y> <z>.' },
        );
      });
    });
  });

  describe('deleting data', (): void => {
    it('fails if there is no resource.', async(): Promise<void> => {
      await expectPatch(
        { path: '/new-delete', body: `<> a solid:InsertDeletePatch;
                 solid:deletes { <x> <y> <z>. }.` },
        { status: 409, message: 'The document does not contain all triples the N3 Patch requests to delete' },
      );
    });

    it('fails if there is only append access.', async(): Promise<void> => {
      await setResource('/append-only', '<a> <b> <c>.', { append: true });
      await expectPatch(
        { path: '/append-only', body: `<> a solid:InsertDeletePatch;
                 solid:deletes { <x> <y> <z>. }.` },
        { status: 401 },
      );
    });

    it('fails if there is only write access.', async(): Promise<void> => {
      await setResource('/write-only', '<a> <b> <c>.', { write: true });
      await expectPatch(
        { path: '/write-only', body: `<> a solid:InsertDeletePatch;
                 solid:deletes { <x> <y> <z>. }.` },
        { status: 401 },
      );
    });

    it('fails if there is only read/append access.', async(): Promise<void> => {
      await setResource('/read-append', '<a> <b> <c>.', { read: true, append: true });
      await expectPatch(
        { path: '/read-append', body: `<> a solid:InsertDeletePatch;
                 solid:deletes { <x> <y> <z>. }.` },
        { status: 401 },
      );
    });

    describe('with read/write access', (): void => {
      it('succeeds if the delete triples exist.', async(): Promise<void> => {
        await setResource('/read-write', '<a> <b> <c>. <x> <y> <z>.', { read: true, write: true });
        await expectPatch(
          { path: '/read-write', body: `<> a solid:InsertDeletePatch;
                 solid:deletes { <x> <y> <z>. }.` },
          { status: 205, turtle: '<a> <b> <c>.' },
        );
      });

      it('fails if the delete triples do not exist.', async(): Promise<void> => {
        await setResource('/read-write', '<a> <b> <c>. <x> <y> <z>.', { read: true, write: true });
        await expectPatch(
          { path: '/read-write', body: `<> a solid:InsertDeletePatch;
                 solid:deletes { <a> <y> <z>. }.` },
          { status: 409, message: 'The document does not contain all triples the N3 Patch requests to delete' },
        );
      });

      it('succeeds if the conditions match.', async(): Promise<void> => {
        await setResource('/read-write', '<a> <b> <c>. <x> <y> <z>.', { read: true, write: true });
        await expectPatch(
          { path: '/read-write', body: `<> a solid:InsertDeletePatch;
                 solid:where   { ?a <y> <z>. };
                 solid:deletes { ?a <y> <z>. }.` },
          { status: 205, turtle: '<a> <b> <c>.' },
        );
      });

      it('fails if the conditions do not match.', async(): Promise<void> => {
        await setResource('/read-write', '<a> <b> <c>.', { read: true, write: true });
        await expectPatch(
          { path: '/read-write', body: `<> a solid:InsertDeletePatch;
                 solid:where   { ?a <y> <z>. };
                 solid:deletes { ?a <b> <c>. }.` },
          { status: 409, message: 'The document does not contain any matches for the N3 Patch solid:where condition.' },
        );
      });
    });
  });

  describe('deleting and inserting data', (): void => {
    it('fails if there is no resource.', async(): Promise<void> => {
      await expectPatch(
        { path: '/new-delete-insert', body: `<> a solid:InsertDeletePatch;
                 solid:inserts { <x> <y> <z>. };
                 solid:deletes { <a> <b> <c>. }.` },
        { status: 409, message: 'The document does not contain all triples the N3 Patch requests to delete' },
      );
    });

    it('fails if there is only append access.', async(): Promise<void> => {
      await setResource('/append-only', '<a> <b> <c>.', { append: true });
      await expectPatch(
        { path: '/append-only', body: `<> a solid:InsertDeletePatch;
                 solid:inserts { <x> <y> <z>. };
                 solid:deletes { <a> <b> <c>. }.` },
        { status: 401 },
      );
    });

    it('fails if there is only write access.', async(): Promise<void> => {
      await setResource('/write-only', '<a> <b> <c>.', { write: true });
      await expectPatch(
        { path: '/write-only', body: `<> a solid:InsertDeletePatch;
                 solid:inserts { <x> <y> <z>. };
                 solid:deletes { <a> <b> <c>. }.` },
        { status: 401 },
      );
    });

    it('fails if there is only read/append access.', async(): Promise<void> => {
      await setResource('/read-append', '<a> <b> <c>.', { read: true, append: true });
      await expectPatch(
        { path: '/read-append', body: `<> a solid:InsertDeletePatch;
                 solid:inserts { <x> <y> <z>. };
                 solid:deletes { <a> <b> <c>. }.` },
        { status: 401 },
      );
    });

    describe('with read/write access', (): void => {
      it('executes deletes before inserts.', async(): Promise<void> => {
        await setResource('/read-write', '<a> <b> <c>.', { read: true, write: true });
        await expectPatch(
          { path: '/read-write', body: `<> a solid:InsertDeletePatch;
                 solid:inserts { <x> <y> <z>. };
                 solid:deletes { <x> <y> <z>. }.` },
          { status: 409, message: 'The document does not contain all triples the N3 Patch requests to delete' },
        );
      });

      it('succeeds if the delete triples exist.', async(): Promise<void> => {
        await setResource('/read-write', '<a> <b> <c>.', { read: true, write: true });
        await expectPatch(
          { path: '/read-write', body: `<> a solid:InsertDeletePatch;
                 solid:inserts { <x> <y> <z>. };
                 solid:deletes { <a> <b> <c>. }.` },
          { status: 205, turtle: '<x> <y> <z>.' },
        );
      });

      it('succeeds if the conditions match.', async(): Promise<void> => {
        await setResource('/read-write', '<a> <b> <c>.', { read: true, write: true });
        await expectPatch(
          { path: '/read-write', body: `<> a solid:InsertDeletePatch;
                 solid:where   { ?a <b> <c>. };
                 solid:inserts { ?a <y> <z>. };
                 solid:deletes { ?a <b> <c>. }.` },
          { status: 205, turtle: '<a> <y> <z>.' },
        );
      });

      it('fails if the conditions do not match.', async(): Promise<void> => {
        await setResource('/read-write', '<a> <b> <c>.', { read: true, write: true });
        await expectPatch(
          { path: '/read-write', body: `<> a solid:InsertDeletePatch;
                 solid:where   { ?a <y> <z>. };
                 solid:inserts { ?a <y> <z>. };
                 solid:deletes { ?a <b> <c>. }.` },
          { status: 409, message: 'The document does not contain any matches for the N3 Patch solid:where condition.' },
        );
      });
    });
  });
});
