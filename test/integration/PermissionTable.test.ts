import fetch from 'cross-fetch';
import { v4 } from 'uuid';
import type { AclPermissionSet } from '../../src/authorization/permissions/AclPermissionSet';
import { AccessMode as AM } from '../../src/authorization/permissions/Permissions';
import { BasicRepresentation } from '../../src/http/representation/BasicRepresentation';
import type { App } from '../../src/init/App';
import type { ResourceStore } from '../../src/storage/ResourceStore';
import { TEXT_TURTLE } from '../../src/util/ContentTypes';
import { ConflictHttpError } from '../../src/util/errors/ConflictHttpError';
import { ensureTrailingSlash, joinUrl } from '../../src/util/PathUtil';
import { AclHelper } from '../util/AclHelper';
import { AcpHelper } from '../util/AcpHelper';
import { getPort } from '../util/Util';
import {
  getDefaultVariables,
  getPresetConfigPath,
  getTestConfigPath,
  getTestFolder,
  instantiateFromConfig,
  removeFolder,
} from './Config';

const DEFAULT_BODY = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix ex: <http://www.example.org/terms#>.

ex:custom ex:givenName "Claudia".`;

const INSERT = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix ex: <http://www.example.org/terms#>.
_:patch a solid:InsertDeletePatch;
  solid:inserts { ex:custom ex:givenName "Alex". }.`;

const DELETE = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix ex: <http://www.example.org/terms#>.

_:rename a solid:InsertDeletePatch;
  solid:deletes { ex:custom ex:givenName "Claudia". }.`;

const N3 = 'text/n3';
const TXT = 'text/plain';

const allModes = [ AM.read, AM.append, AM.create, AM.write, AM.delete ];

// Based on https://github.com/solid/specification/issues/14#issuecomment-683480525
// Columns: method, target, C/ permissions, C/R permissions, body, content-type, target exists, target does not exist
// `undefined` implies C/R inherits the permissions of C/
// For PUT/PATCH/DELETE we return 205 instead of 200/204
/* eslint-disable style/no-multi-spaces */
const table: [string, string, AM[], AM[] | undefined, string, string, number, number][] = [
  // No authorization headers are sent in an OPTIONS request making it impossible to grant permission.
  // See https://github.com/CommunitySolidServer/CommunitySolidServer/issues/1246#issuecomment-1087325235
  // From https://fetch.spec.whatwg.org/#cors-preflight-fetch it follows
  // that a preflight check should always return an OK response.
  [ 'OPTIONS', 'C/R', [],                     undefined,              '',     '',  204, 204 ],
  [ 'OPTIONS', 'C/R', [],                     [ AM.read ],            '',     '',  204, 204 ],
  [ 'OPTIONS', 'C/R', [ AM.read ],            undefined,              '',     '',  204, 204 ],

  [ 'HEAD',    'C/R', [],                     undefined,              '',     '',  401, 401 ],
  [ 'HEAD',    'C/R', [],                     [ AM.read ],            '',     '',  200, 404 ],
  [ 'HEAD',    'C/R', [ AM.read ],            undefined,              '',     '',  200, 404 ],

  [ 'GET',     'C/R', [],                     undefined,              '',     '',  401, 401 ],
  [ 'GET',     'C/R', [],                     [ AM.read ],            '',     '',  200, 404 ],
  [ 'GET',     'C/R', [ AM.read ],            undefined,              '',     '',  200, 404 ],
  // Agreed upon deviation from the original table; more conservative interpretation allowed.
  // Original returns 404 in the case of C/R not existing.
  [ 'GET',     'C/R', [ AM.read ],            [ AM.write ],           '',     '',  401, 401 ],

  [ 'POST',    'C/',  [],                     undefined,              '',     TXT, 401, 401 ],
  [ 'POST',    'C/',  [],                     [ AM.read ],            '',     TXT, 401, 401 ],
  [ 'POST',    'C/',  [ AM.append ],          undefined,              '',     TXT, 201, 201 ],
  [ 'POST',    'C/',  [ AM.append ],          [ AM.read ],            '',     TXT, 201, 201 ],
  [ 'POST',    'C/',  [ AM.read, AM.append ], undefined,              '',     TXT, 201, 201 ],
  [ 'POST',    'C/',  [ AM.read, AM.append ], [ AM.read ],            '',     TXT, 201, 201 ],

  [ 'PUT',     'C/',  [],                     undefined,              '',     N3,  401, 401 ],
  [ 'PUT',     'C/',  [ AM.read ],            undefined,              '',     N3,  401, 401 ],
  // We return a 409 when targeting an existing container as we only allow changes targeting the metadata directly
  [ 'PUT',     'C/',  [ AM.write ],           undefined,              '',     '',  409, 201 ],

  [ 'PUT',     'C/R', [],                     undefined,              '',     TXT, 401, 401 ],
  [ 'PUT',     'C/R', [],                     [ AM.read ],            '',     TXT, 401, 401 ],
  [ 'PUT',     'C/R', [],                     [ AM.append ],          '',     TXT, 401, 401 ],
  [ 'PUT',     'C/R', [],                     [ AM.write ],           '',     TXT, 205, 401 ],
  [ 'PUT',     'C/R', [ AM.read ],            undefined,              '',     TXT, 401, 401 ],
  [ 'PUT',     'C/R', [ AM.append ],          undefined,              '',     TXT, 401, 201 ],
  [ 'PUT',     'C/R', [ AM.write ],           undefined,              '',     TXT, 205, 201 ],
  [ 'PUT',     'C/R', [ AM.append ],          [ AM.write ],           '',     TXT, 205, 201 ],

  // All PATCH operations with read permissions return 401 instead of 404 if the target does not exist.
  // This is a consequence of PATCH always creating a resource in case it does not exist.
  // https://solidproject.org/TR/2021/protocol-20211217#n3-patch
  // "Start from the RDF dataset in the target document,
  // or an empty RDF dataset if the target resource does not exist yet."
  [ 'PATCH',   'C/R', [],                     undefined,              DELETE, N3,  401, 401 ],
  [ 'PATCH',   'C/R', [],                     [ AM.read ],            DELETE, N3,  401, 401 ],
  [ 'PATCH',   'C/R', [],                     [ AM.append ],          INSERT, N3,  205, 401 ],
  [ 'PATCH',   'C/R', [],                     [ AM.append ],          DELETE, N3,  401, 401 ],
  [ 'PATCH',   'C/R', [],                     [ AM.write ],           INSERT, N3,  205, 401 ],
  [ 'PATCH',   'C/R', [],                     [ AM.write ],           DELETE, N3,  401, 401 ],
  [ 'PATCH',   'C/R', [ AM.append ],          [ AM.write ],           INSERT, N3,  205, 201 ],
  [ 'PATCH',   'C/R', [ AM.append ],          [ AM.write ],           DELETE, N3,  401, 401 ],
  [ 'PATCH',   'C/R', [],                     [ AM.read, AM.write ],  DELETE, N3,  205, 401 ],

  [ 'DELETE',  'C/R', [],                     undefined,              '',     '',  401, 401 ],
  [ 'DELETE',  'C/R', [],                     [ AM.read ],            '',     '',  401, 404 ],
  [ 'DELETE',  'C/R', [],                     [ AM.append ],          '',     '',  401, 401 ],
  [ 'DELETE',  'C/R', [],                     [ AM.write ],           '',     '',  401, 401 ],
  [ 'DELETE',  'C/R', [ AM.read ],            undefined,              '',     '',  401, 404 ],
  [ 'DELETE',  'C/R', [ AM.append ],          undefined,              '',     '',  401, 401 ],
  [ 'DELETE',  'C/R', [ AM.append ],          [ AM.read ],            '',     '',  401, 404 ],
  [ 'DELETE',  'C/R', [ AM.write ],           undefined,              '',     '',  205, 401 ],
  [ 'DELETE',  'C/R', [ AM.write ],           [ AM.read ],            '',     '',  401, 404 ],
  [ 'DELETE',  'C/R', [ AM.write ],           [ AM.append ],          '',     '',  401, 401 ],

  [ 'DELETE',  'C/',  [],                     undefined,              '',     '',  401, 401 ],
  [ 'DELETE',  'C/',  [ AM.read ],            undefined,              '',     '',  401, 404 ],
  [ 'DELETE',  'C/',  [ AM.append ],          undefined,              '',     '',  401, 401 ],
  [ 'DELETE',  'C/',  [ AM.write ],           undefined,              '',     '',  401, 401 ],
  [ 'DELETE',  'C/',  [ AM.read, AM.write ],  undefined,              '',     '',  205, 404 ],
];
/* eslint-enable style/no-multi-spaces */

function toPermission(modes: AM[]): AclPermissionSet {
  return Object.fromEntries(modes.map((mode): [AM, boolean] => [ mode, true ]));
}

async function setWebAclPermissions(
  store: ResourceStore,
  target: string,
  permissions: AclPermissionSet,
  childPermissions: AclPermissionSet,
): Promise<void> {
  const aclHelper = new AclHelper(store);
  await aclHelper.setSimpleAcl(target, [
    { permissions, agentClass: 'agent', accessTo: true },
    { permissions: childPermissions, agentClass: 'agent', default: true },
  ]);
}

async function setAcpPermissions(
  store: ResourceStore,
  target: string,
  permissions: AclPermissionSet,
  childPermissions: AclPermissionSet,
): Promise<void> {
  const acpHelper = new AcpHelper(store);
  const publicMatcher = acpHelper.createMatcher({ publicAgent: true });
  const policies = [ acpHelper.createPolicy({
    // Casting from enum to strings
    allow: Object.keys(permissions) as any,
    anyOf: [ publicMatcher ],
  }) ];
  const memberPolicies = [ acpHelper.createPolicy({
    allow: Object.keys(childPermissions) as any,
    anyOf: [ publicMatcher ],
  }) ];
  await acpHelper.setAcp(target, acpHelper.createAcr({
    resource: target,
    policies,
    memberPolicies,
  }));
}

const port = getPort('PermissionTable');
const baseUrl = `http://localhost:${port}/`;

type AuthFunctionType = (store: ResourceStore, target: string,
  permissions: AclPermissionSet, childPermissions: AclPermissionSet) => Promise<void>;

const rootFilePath = getTestFolder('permissionTable');
const stores: [string, string, { configs: string[]; authFunction: AuthFunctionType; teardown: () => Promise<void> }][] =
  [
    [
      'WebACL',
      'in-memory storage',
      {
        configs: [ 'ldp/authorization/webacl.json', 'util/auxiliary/acl.json', 'storage/backend/memory.json' ],
        authFunction: setWebAclPermissions,
        teardown: jest.fn(),
      },
    ],
    [
      'WebACL',
      'on-disk storage',
      {
        configs: [ 'ldp/authorization/webacl.json', 'util/auxiliary/acl.json', 'storage/backend/file.json' ],
        authFunction: setWebAclPermissions,
        teardown: async(): Promise<void> => removeFolder(rootFilePath),
      },
    ],
    [
      'ACP',
      'in-memory storage',
      {
        configs: [ 'ldp/authorization/acp.json', 'util/auxiliary/acr.json', 'storage/backend/memory.json' ],
        authFunction: setAcpPermissions,
        teardown: jest.fn(),
      },
    ],
    [
      'ACP',
      'on-disk storage',
      {
        configs: [ 'ldp/authorization/acp.json', 'util/auxiliary/acr.json', 'storage/backend/file.json' ],
        authFunction: setAcpPermissions,
        teardown: async(): Promise<void> => removeFolder(rootFilePath),
      },
    ],
  ];

describe.each(stores)('A request on a server with %s authorization and %s', (
  auth,
  name,
  { configs, authFunction, teardown },
): void => {
  let app: App;
  let store: ResourceStore;

  beforeAll(async(): Promise<void> => {
    const variables = {
      ...getDefaultVariables(port, baseUrl),
      'urn:solid-server:default:variable:rootFilePath': rootFilePath,
    };

    // Create and start the server
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      [
        ...configs.map(getPresetConfigPath),
        getTestConfigPath('permission-table.json'),
      ],
      variables,
    ) as Record<string, any>;
    ({ app, store } = instances);

    await app.start();
  });

  afterAll(async(): Promise<void> => {
    await teardown();
    await app.stop();
  });

  describe.each(table)('%s %s with permissions C/: %s and C/R: %s', (...entry): void => {
    const [ method, target, cPerm, crPermTemp, body, contentType, existsCode, notExistsCode ] = entry;
    const crPerm = crPermTemp ?? cPerm;
    const id = v4();
    const root = ensureTrailingSlash(joinUrl(baseUrl, id));
    const container = ensureTrailingSlash(joinUrl(root, 'container/'));
    const resource = joinUrl(container, 'resource');
    const targetingContainer = target !== 'C/R';
    const targetUrl = targetingContainer ? container : resource;
    let init: RequestInit;

    beforeEach(async(): Promise<void> => {
      // POST is special as the request targets the container but we care about the generated resource
      const parent = targetingContainer && method !== 'POST' ? root : container;

      // Create C/ and set up permissions
      try {
        await store.setRepresentation({ path: parent }, new BasicRepresentation([], TEXT_TURTLE));
      } catch (error: unknown) {
        if (!ConflictHttpError.isInstance(error)) {
          throw error;
        }
      }

      await authFunction(
        store,
        parent,
        toPermission(parent === root ? allModes : cPerm),
        toPermission(parent === root ? cPerm : crPerm),
      );

      // Set up fetch parameters
      init = { method };
      if (contentType && contentType.length > 0) {
        init.body = body;
        init.headers = { 'content-type': contentType };
      }
    });

    it('target does not exist.', async(): Promise<void> => {
      const response = await fetch(targetUrl, init);
      expect(response.status).toBe(notExistsCode);
    });

    it('target exists.', async(): Promise<void> => {
      try {
        await store.setRepresentation({ path: targetUrl }, new BasicRepresentation(DEFAULT_BODY, TEXT_TURTLE));
      } catch (error: unknown) {
        if (!ConflictHttpError.isInstance(error)) {
          throw error;
        }
      }
      const response = await fetch(targetUrl, init);
      expect(response.status).toBe(existsCode);
    });
  });
});
