import { namedNode, quad } from '@rdfjs/data-model';
import streamifyArray from 'streamify-array';
import type { Credentials } from '../../../src/authentication/Credentials';
import type { AclManager } from '../../../src/authorization/AclManager';
import { WebAclAuthorizer } from '../../../src/authorization/WebAclAuthorizer';
import type { PermissionSet } from '../../../src/ldp/permissions/PermissionSet';
import type { Representation } from '../../../src/ldp/representation/Representation';
import type { ResourceIdentifier } from '../../../src/ldp/representation/ResourceIdentifier';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { ForbiddenHttpError } from '../../../src/util/errors/ForbiddenHttpError';
import { InternalServerError } from '../../../src/util/errors/InternalServerError';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';
import { UnauthorizedHttpError } from '../../../src/util/errors/UnauthorizedHttpError';
import { SingleRootIdentifierStrategy } from '../../../src/util/identifiers/SingleRootIdentifierStrategy';

const nn = namedNode;

const acl = 'http://www.w3.org/ns/auth/acl#';

describe('A WebAclAuthorizer', (): void => {
  let authorizer: WebAclAuthorizer;
  const aclManager: AclManager = {
    getAclDocument: async(id: ResourceIdentifier): Promise<ResourceIdentifier> =>
      id.path.endsWith('.acl') ? id : { path: `${id.path}.acl` },
    isAclDocument: async(id: ResourceIdentifier): Promise<boolean> => id.path.endsWith('.acl'),
    getAclConstrainedResource: async(id: ResourceIdentifier): Promise<ResourceIdentifier> =>
      !id.path.endsWith('.acl') ? id : { path: id.path.slice(0, -4) },
  };
  let store: ResourceStore;
  const identifierStrategy = new SingleRootIdentifierStrategy('http://test.com/');
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

    store = {
      getRepresentation: jest.fn(),
    } as any;
    authorizer = new WebAclAuthorizer(aclManager, store, identifierStrategy);
  });

  it('handles all inputs.', async(): Promise<void> => {
    authorizer = new WebAclAuthorizer(aclManager, null as any, identifierStrategy);
    await expect(authorizer.canHandle({} as any)).resolves.toBeUndefined();
  });

  it('allows access if the acl file allows all agents.', async(): Promise<void> => {
    store.getRepresentation = async(): Promise<Representation> => ({ data: streamifyArray([
      quad(nn('auth'), nn(`${acl}agentClass`), nn('http://xmlns.com/foaf/0.1/Agent')),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
    ]) } as Representation);
    await expect(authorizer.handle({ identifier, permissions, credentials })).resolves.toBeUndefined();
  });

  it('allows access if there is a parent acl file allowing all agents.', async(): Promise<void> => {
    store.getRepresentation = async(id: ResourceIdentifier): Promise<Representation> => {
      if (id.path.endsWith('foo.acl')) {
        throw new NotFoundHttpError();
      }
      return {
        data: streamifyArray([
          quad(nn('auth'), nn(`${acl}agentClass`), nn('http://xmlns.com/foaf/0.1/Agent')),
          quad(nn('auth'), nn(`${acl}default`), nn(identifierStrategy.getParentContainer(identifier).path)),
          quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
        ]),
      } as Representation;
    };
    await expect(authorizer.handle({ identifier, permissions, credentials })).resolves.toBeUndefined();
  });

  it('allows access to authorized agents if the acl files allows all authorized users.', async(): Promise<void> => {
    store.getRepresentation = async(): Promise<Representation> => ({ data: streamifyArray([
      quad(nn('auth'), nn(`${acl}agentClass`), nn('http://xmlns.com/foaf/0.1/AuthenticatedAgent')),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
    ]) } as Representation);
    credentials.webId = 'http://test.com/user';
    await expect(authorizer.handle({ identifier, permissions, credentials })).resolves.toBeUndefined();
  });

  it('errors if authorization is required but the agent is not authorized.', async(): Promise<void> => {
    store.getRepresentation = async(): Promise<Representation> => ({ data: streamifyArray([
      quad(nn('auth'), nn(`${acl}agentClass`), nn('http://xmlns.com/foaf/0.1/AuthenticatedAgent')),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
    ]) } as Representation);
    await expect(authorizer.handle({ identifier, permissions, credentials })).rejects.toThrow(UnauthorizedHttpError);
  });

  it('allows access to specific agents if the acl files identifies them.', async(): Promise<void> => {
    credentials.webId = 'http://test.com/user';
    store.getRepresentation = async(): Promise<Representation> => ({ data: streamifyArray([
      quad(nn('auth'), nn(`${acl}agent`), nn(credentials.webId!)),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
    ]) } as Representation);
    await expect(authorizer.handle({ identifier, permissions, credentials })).resolves.toBeUndefined();
  });

  it('errors if a specific agents wants to access files not assigned to them.', async(): Promise<void> => {
    credentials.webId = 'http://test.com/user';
    store.getRepresentation = async(): Promise<Representation> => ({ data: streamifyArray([
      quad(nn('auth'), nn(`${acl}agent`), nn('http://test.com/differentUser')),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
    ]) } as Representation);
    await expect(authorizer.handle({ identifier, permissions, credentials })).rejects.toThrow(ForbiddenHttpError);
  });

  it('allows access to the acl file if control is allowed.', async(): Promise<void> => {
    credentials.webId = 'http://test.com/user';
    identifier.path = 'http://test.com/foo';
    store.getRepresentation = async(): Promise<Representation> => ({ data: streamifyArray([
      quad(nn('auth'), nn(`${acl}agent`), nn(credentials.webId!)),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Control`)),
    ]) } as Representation);
    const aclIdentifier = await aclManager.getAclDocument(identifier);
    await expect(authorizer.handle({ identifier: aclIdentifier, permissions, credentials })).resolves.toBeUndefined();
  });

  it('errors if an agent tries to edit the acl file without control permissions.', async(): Promise<void> => {
    credentials.webId = 'http://test.com/user';
    identifier.path = 'http://test.com/foo';
    store.getRepresentation = async(): Promise<Representation> => ({ data: streamifyArray([
      quad(nn('auth'), nn(`${acl}agent`), nn(credentials.webId!)),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
    ]) } as Representation);
    identifier = await aclManager.getAclDocument(identifier);
    await expect(authorizer.handle({ identifier, permissions, credentials })).rejects.toThrow(ForbiddenHttpError);
  });

  it('passes errors of the ResourceStore along.', async(): Promise<void> => {
    store.getRepresentation = async(): Promise<Representation> => {
      throw new Error('TEST!');
    };
    await expect(authorizer.handle({ identifier, permissions, credentials })).rejects.toThrow('TEST!');
  });

  it('errors if the root container has no corresponding acl document.', async(): Promise<void> => {
    store.getRepresentation = async(): Promise<Representation> => {
      throw new NotFoundHttpError();
    };
    const promise = authorizer.handle({ identifier, permissions, credentials });
    await expect(promise).rejects.toThrow('No ACL document found for root container');
    await expect(promise).rejects.toThrow(InternalServerError);
  });

  it('allows an agent to append if they have write access.', async(): Promise<void> => {
    credentials.webId = 'http://test.com/user';
    identifier.path = 'http://test.com/foo';
    permissions = {
      read: false,
      write: false,
      append: true,
    };
    store.getRepresentation = async(): Promise<Representation> => ({ data: streamifyArray([
      quad(nn('auth'), nn(`${acl}agent`), nn(credentials.webId!)),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Write`)),
    ]) } as Representation);
    await expect(authorizer.handle({ identifier, permissions, credentials })).resolves.toBeUndefined();
  });
});
