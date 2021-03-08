import { namedNode, quad } from '@rdfjs/data-model';
import type { Credentials } from '../../../src/authentication/Credentials';
import { WebAclAuthorization } from '../../../src/authorization/WebAclAuthorization';
import { WebAclAuthorizer } from '../../../src/authorization/WebAclAuthorizer';
import type { AuxiliaryIdentifierStrategy } from '../../../src/ldp/auxiliary/AuxiliaryIdentifierStrategy';
import type { PermissionSet } from '../../../src/ldp/permissions/PermissionSet';
import type { Representation } from '../../../src/ldp/representation/Representation';
import type { ResourceIdentifier } from '../../../src/ldp/representation/ResourceIdentifier';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { ForbiddenHttpError } from '../../../src/util/errors/ForbiddenHttpError';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../../../src/util/errors/NotImplementedHttpError';
import { UnauthorizedHttpError } from '../../../src/util/errors/UnauthorizedHttpError';
import { SingleRootIdentifierStrategy } from '../../../src/util/identifiers/SingleRootIdentifierStrategy';
import { guardedStreamFrom } from '../../../src/util/StreamUtil';

const nn = namedNode;

const acl = 'http://www.w3.org/ns/auth/acl#';

describe('A WebAclAuthorizer', (): void => {
  let authorizer: WebAclAuthorizer;
  const aclStrategy: AuxiliaryIdentifierStrategy = {
    getAuxiliaryIdentifier: (id: ResourceIdentifier): ResourceIdentifier => ({ path: `${id.path}.acl` }),
    isAuxiliaryIdentifier: (id: ResourceIdentifier): boolean => id.path.endsWith('.acl'),
    getAssociatedIdentifier: (id: ResourceIdentifier): ResourceIdentifier => ({ path: id.path.slice(0, -4) }),
  } as any;
  let store: ResourceStore;
  const identifierStrategy = new SingleRootIdentifierStrategy('http://test.com/');
  let permissions: PermissionSet;
  let credentials: Credentials;
  let identifier: ResourceIdentifier;
  let authorization: WebAclAuthorization;

  beforeEach(async(): Promise<void> => {
    permissions = {
      read: true,
      append: false,
      write: true,
      control: false,
    };
    credentials = {};
    identifier = { path: 'http://test.com/foo' };
    authorization = new WebAclAuthorization(
      {
        read: false,
        append: false,
        write: false,
        control: false,
      },
      {
        read: false,
        append: false,
        write: false,
        control: false,
      },
    );

    store = {
      getRepresentation: jest.fn(),
    } as any;
    authorizer = new WebAclAuthorizer(aclStrategy, store, identifierStrategy);
  });

  it('handles all non-acl inputs.', async(): Promise<void> => {
    authorizer = new WebAclAuthorizer(aclStrategy, null as any, identifierStrategy);
    await expect(authorizer.canHandle({ identifier } as any)).resolves.toBeUndefined();
    await expect(authorizer.canHandle({ identifier: aclStrategy.getAuxiliaryIdentifier(identifier) } as any))
      .rejects.toThrow(NotImplementedHttpError);
  });

  it('allows access if the acl file allows all agents.', async(): Promise<void> => {
    store.getRepresentation = async(): Promise<Representation> => ({ data: guardedStreamFrom([
      quad(nn('auth'), nn(`${acl}agentClass`), nn('http://xmlns.com/foaf/0.1/Agent')),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Write`)),
    ]) } as Representation);
    Object.assign(authorization.everyone, { read: true, write: true, append: true });
    Object.assign(authorization.user, { read: true, write: true, append: true });
    await expect(authorizer.handle({ identifier, permissions, credentials })).resolves.toEqual(authorization);
  });

  it('allows access if there is a parent acl file allowing all agents default access.', async(): Promise<void> => {
    store.getRepresentation = async(id: ResourceIdentifier): Promise<Representation> => {
      if (id.path.endsWith('foo.acl')) {
        throw new NotFoundHttpError();
      }
      return {
        data: guardedStreamFrom([
          quad(nn('auth'), nn(`${acl}agentClass`), nn('http://xmlns.com/foaf/0.1/Agent')),
          quad(nn('auth'), nn(`${acl}default`), nn(identifierStrategy.getParentContainer(identifier).path)),
          quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
          quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Write`)),
        ]),
      } as Representation;
    };
    Object.assign(authorization.everyone, { read: true, write: true, append: true });
    Object.assign(authorization.user, { read: true, write: true, append: true });
    await expect(authorizer.handle({ identifier, permissions, credentials })).resolves.toEqual(authorization);
  });

  it('allows access if there is a parent acl file allowing all agents specific access.', async(): Promise<void> => {
    store.getRepresentation = async(id: ResourceIdentifier): Promise<Representation> => {
      if (id.path.endsWith('foo.acl')) {
        throw new NotFoundHttpError();
      }
      return {
        data: guardedStreamFrom([
          quad(nn('auth'), nn(`${acl}agentClass`), nn('http://xmlns.com/foaf/0.1/Agent')),
          quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
          quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
          quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Write`)),
        ]),
      } as Representation;
    };
    Object.assign(authorization.everyone, { read: true, write: true, append: true });
    Object.assign(authorization.user, { read: true, write: true, append: true });
    await expect(authorizer.handle({ identifier, permissions, credentials })).resolves.toEqual(authorization);
  });

  it('allows access to authorized agents if the acl files allows all authorized users.', async(): Promise<void> => {
    store.getRepresentation = async(): Promise<Representation> => ({ data: guardedStreamFrom([
      quad(nn('auth'), nn(`${acl}agentClass`), nn(`${acl}AuthenticatedAgent`)),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Write`)),
    ]) } as Representation);
    credentials.webId = 'http://test.com/user';
    Object.assign(authorization.user, { read: true, write: true, append: true });
    await expect(authorizer.handle({ identifier, permissions, credentials })).resolves.toEqual(authorization);
  });

  it('errors if authorization is required but the agent is not authorized.', async(): Promise<void> => {
    store.getRepresentation = async(): Promise<Representation> => ({ data: guardedStreamFrom([
      quad(nn('auth'), nn(`${acl}agentClass`), nn(`${acl}AuthenticatedAgent`)),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Write`)),
    ]) } as Representation);
    await expect(authorizer.handle({ identifier, permissions, credentials })).rejects.toThrow(UnauthorizedHttpError);
  });

  it('allows access to specific agents if the acl files identifies them.', async(): Promise<void> => {
    credentials.webId = 'http://test.com/user';
    store.getRepresentation = async(): Promise<Representation> => ({ data: guardedStreamFrom([
      quad(nn('auth'), nn(`${acl}agent`), nn(credentials.webId!)),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Write`)),
    ]) } as Representation);
    Object.assign(authorization.user, { read: true, write: true, append: true });
    await expect(authorizer.handle({ identifier, permissions, credentials })).resolves.toEqual(authorization);
  });

  it('errors if a specific agents wants to access files not assigned to them.', async(): Promise<void> => {
    credentials.webId = 'http://test.com/user';
    store.getRepresentation = async(): Promise<Representation> => ({ data: guardedStreamFrom([
      quad(nn('auth'), nn(`${acl}agent`), nn('http://test.com/differentUser')),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Write`)),
    ]) } as Representation);
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
    await expect(promise).rejects.toThrow(ForbiddenHttpError);
  });

  it('allows an agent to append if they have write access.', async(): Promise<void> => {
    credentials.webId = 'http://test.com/user';
    identifier.path = 'http://test.com/foo';
    permissions = {
      read: false,
      write: false,
      append: true,
      control: false,
    };
    store.getRepresentation = async(): Promise<Representation> => ({ data: guardedStreamFrom([
      quad(nn('auth'), nn(`${acl}agent`), nn(credentials.webId!)),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Write`)),
    ]) } as Representation);
    Object.assign(authorization.user, { write: true, append: true });
    await expect(authorizer.handle({ identifier, permissions, credentials })).resolves.toEqual(authorization);
  });
});
