import { namedNode, quad } from '@rdfjs/data-model';
import streamifyArray from 'streamify-array';
import type { Credentials } from '../../../src/authentication/Credentials';
import type { AclManager } from '../../../src/authorization/AclManager';
import { WebAclAuthorizer } from '../../../src/authorization/WebAclAuthorizer';
import type { PermissionSet } from '../../../src/ldp/permissions/PermissionSet';
import type { Representation } from '../../../src/ldp/representation/Representation';
import type { ResourceIdentifier } from '../../../src/ldp/representation/ResourceIdentifier';
import type { ContainerManager } from '../../../src/storage/ContainerManager';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { ForbiddenHttpError } from '../../../src/util/errors/ForbiddenHttpError';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';
import { UnauthorizedHttpError } from '../../../src/util/errors/UnauthorizedHttpError';

const nn = namedNode;

const acl = 'http://www.w3.org/ns/auth/acl#';

describe('A WebAclAuthorizer', (): void => {
  let authorizer: WebAclAuthorizer;
  const aclManager: AclManager = {
    getAcl: async(id: ResourceIdentifier): Promise<ResourceIdentifier> =>
      id.path.endsWith('.acl') ? id : { path: `${id.path}.acl` },
    isAcl: async(id: ResourceIdentifier): Promise<boolean> => id.path.endsWith('.acl'),
  };
  const containerManager: ContainerManager = {
    getContainer: async(id: ResourceIdentifier): Promise<ResourceIdentifier> =>
      ({ path: new URL('..', id.path).toString() }),
  };
  let permissions: PermissionSet;
  let credentials: Credentials;
  let identifier: ResourceIdentifier;

  beforeEach(async(): Promise<void> => {
    permissions = {
      read: true,
      append: false,
      write: false,
    };
    credentials = {};
    identifier = { path: 'http://test.com/foo' };
  });

  it('handles all inputs.', async(): Promise<void> => {
    authorizer = new WebAclAuthorizer(aclManager, containerManager, null as any);
    await expect(authorizer.canHandle({} as any)).resolves.toBeUndefined();
  });

  it('allows access if the acl file allows all agents.', async(): Promise<void> => {
    const store = {
      getRepresentation: async(): Promise<Representation> => ({ data: streamifyArray([
        quad(nn('auth'), nn(`${acl}agentClass`), nn('http://xmlns.com/foaf/0.1/Agent')),
        quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
        quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
      ]) } as Representation),
    } as unknown as ResourceStore;
    authorizer = new WebAclAuthorizer(aclManager, containerManager, store);
    await expect(authorizer.handle({ identifier, permissions, credentials })).resolves.toBeUndefined();
  });

  it('allows access if there is a parent acl file allowing all agents.', async(): Promise<void> => {
    const store = {
      async getRepresentation(id: ResourceIdentifier): Promise<Representation> {
        if (id.path.endsWith('foo.acl')) {
          throw new NotFoundHttpError();
        }
        return {
          data: streamifyArray([
            quad(nn('auth'), nn(`${acl}agentClass`), nn('http://xmlns.com/foaf/0.1/Agent')),
            quad(nn('auth'), nn(`${acl}default`), nn((await containerManager.getContainer(identifier)).path)),
            quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
          ]),
        } as Representation;
      },
    } as unknown as ResourceStore;
    authorizer = new WebAclAuthorizer(aclManager, containerManager, store);
    await expect(authorizer.handle({ identifier, permissions, credentials })).resolves.toBeUndefined();
  });

  it('allows access to authorized agents if the acl files allows all authorized users.', async(): Promise<void> => {
    const store = {
      getRepresentation: async(): Promise<Representation> => ({ data: streamifyArray([
        quad(nn('auth'), nn(`${acl}agentClass`), nn('http://xmlns.com/foaf/0.1/AuthenticatedAgent')),
        quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
        quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
      ]) } as Representation),
    } as unknown as ResourceStore;
    authorizer = new WebAclAuthorizer(aclManager, containerManager, store);
    credentials.webID = 'http://test.com/user';
    await expect(authorizer.handle({ identifier, permissions, credentials })).resolves.toBeUndefined();
  });

  it('errors if authorization is required but the agent is not authorized.', async(): Promise<void> => {
    const store = {
      getRepresentation: async(): Promise<Representation> => ({ data: streamifyArray([
        quad(nn('auth'), nn(`${acl}agentClass`), nn('http://xmlns.com/foaf/0.1/AuthenticatedAgent')),
        quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
        quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
      ]) } as Representation),
    } as unknown as ResourceStore;
    authorizer = new WebAclAuthorizer(aclManager, containerManager, store);
    await expect(authorizer.handle({ identifier, permissions, credentials })).rejects.toThrow(UnauthorizedHttpError);
  });

  it('allows access to specific agents if the acl files identifies them.', async(): Promise<void> => {
    credentials.webID = 'http://test.com/user';
    const store = {
      getRepresentation: async(): Promise<Representation> => ({ data: streamifyArray([
        quad(nn('auth'), nn(`${acl}agent`), nn(credentials.webID!)),
        quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
        quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
      ]) } as Representation),
    } as unknown as ResourceStore;
    authorizer = new WebAclAuthorizer(aclManager, containerManager, store);
    await expect(authorizer.handle({ identifier, permissions, credentials })).resolves.toBeUndefined();
  });

  it('errors if a specific agents wants to access files not assigned to them.', async(): Promise<void> => {
    credentials.webID = 'http://test.com/user';
    const store = {
      getRepresentation: async(): Promise<Representation> => ({ data: streamifyArray([
        quad(nn('auth'), nn(`${acl}agent`), nn('http://test.com/differentUser')),
        quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
        quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
      ]) } as Representation),
    } as unknown as ResourceStore;
    authorizer = new WebAclAuthorizer(aclManager, containerManager, store);
    await expect(authorizer.handle({ identifier, permissions, credentials })).rejects.toThrow(ForbiddenHttpError);
  });

  it('allows access to the acl file if control is allowed.', async(): Promise<void> => {
    credentials.webID = 'http://test.com/user';
    identifier.path = 'http://test.com/foo';
    const store = {
      getRepresentation: async(): Promise<Representation> => ({ data: streamifyArray([
        quad(nn('auth'), nn(`${acl}agent`), nn(credentials.webID!)),
        quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
        quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Control`)),
      ]) } as Representation),
    } as unknown as ResourceStore;
    identifier = await aclManager.getAcl(identifier);
    authorizer = new WebAclAuthorizer(aclManager, containerManager, store);
    await expect(authorizer.handle({ identifier, permissions, credentials })).resolves.toBeUndefined();
  });

  it('errors if an agent tries to edit the acl file without control permissions.', async(): Promise<void> => {
    credentials.webID = 'http://test.com/user';
    identifier.path = 'http://test.com/foo';
    const store = {
      getRepresentation: async(): Promise<Representation> => ({ data: streamifyArray([
        quad(nn('auth'), nn(`${acl}agent`), nn(credentials.webID!)),
        quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
        quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
      ]) } as Representation),
    } as unknown as ResourceStore;
    identifier = await aclManager.getAcl(identifier);
    authorizer = new WebAclAuthorizer(aclManager, containerManager, store);
    await expect(authorizer.handle({ identifier, permissions, credentials })).rejects.toThrow(ForbiddenHttpError);
  });

  it('passes errors of the ResourceStore along.', async(): Promise<void> => {
    const store = {
      async getRepresentation(): Promise<Representation> {
        throw new Error('TEST!');
      },
    } as unknown as ResourceStore;
    authorizer = new WebAclAuthorizer(aclManager, containerManager, store);
    await expect(authorizer.handle({ identifier, permissions, credentials })).rejects.toThrow('TEST!');
  });
});
