import { namedNode, quad } from '@rdfjs/data-model';
import { CredentialGroup } from '../../../src/authentication/Credentials';
import type { CredentialSet } from '../../../src/authentication/Credentials';
import type { AccessChecker } from '../../../src/authorization/access-checkers/AccessChecker';
import { WebAclAuthorization } from '../../../src/authorization/WebAclAuthorization';
import { WebAclAuthorizer } from '../../../src/authorization/WebAclAuthorizer';
import type { AuxiliaryIdentifierStrategy } from '../../../src/ldp/auxiliary/AuxiliaryIdentifierStrategy';
import { AccessMode } from '../../../src/ldp/permissions/PermissionSet';
import type { Representation } from '../../../src/ldp/representation/Representation';
import type { ResourceIdentifier } from '../../../src/ldp/representation/ResourceIdentifier';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { ForbiddenHttpError } from '../../../src/util/errors/ForbiddenHttpError';
import { InternalServerError } from '../../../src/util/errors/InternalServerError';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../../../src/util/errors/NotImplementedHttpError';
import { UnauthorizedHttpError } from '../../../src/util/errors/UnauthorizedHttpError';
import { SingleRootIdentifierStrategy } from '../../../src/util/identifiers/SingleRootIdentifierStrategy';
import { guardedStreamFrom } from '../../../src/util/StreamUtil';

const nn = namedNode;

const acl = 'http://www.w3.org/ns/auth/acl#';
const rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';

describe('A WebAclAuthorizer', (): void => {
  let authorizer: WebAclAuthorizer;
  const aclStrategy: AuxiliaryIdentifierStrategy = {
    getAuxiliaryIdentifier: (id: ResourceIdentifier): ResourceIdentifier => ({ path: `${id.path}.acl` }),
    isAuxiliaryIdentifier: (id: ResourceIdentifier): boolean => id.path.endsWith('.acl'),
    getAssociatedIdentifier: (id: ResourceIdentifier): ResourceIdentifier => ({ path: id.path.slice(0, -4) }),
  } as any;
  let store: jest.Mocked<ResourceStore>;
  const identifierStrategy = new SingleRootIdentifierStrategy('http://test.com/');
  let modes: Set<AccessMode>;
  let credentials: CredentialSet;
  let identifier: ResourceIdentifier;
  let authorization: WebAclAuthorization;
  let accessChecker: jest.Mocked<AccessChecker>;

  beforeEach(async(): Promise<void> => {
    modes = new Set([ AccessMode.read, AccessMode.write ]);
    credentials = { [CredentialGroup.public]: {}, [CredentialGroup.agent]: {}};
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

    accessChecker = {
      handleSafe: jest.fn().mockResolvedValue(true),
    } as any;

    authorizer = new WebAclAuthorizer(aclStrategy, store, identifierStrategy, accessChecker);
  });

  it('handles all non-acl inputs.', async(): Promise<void> => {
    await expect(authorizer.canHandle({ identifier, credentials, modes })).resolves.toBeUndefined();
    await expect(authorizer.canHandle({ identifier: aclStrategy.getAuxiliaryIdentifier(identifier) } as any))
      .rejects.toThrow(NotImplementedHttpError);
  });

  it('handles all valid modes and ignores other ones.', async(): Promise<void> => {
    credentials.agent = { webId: 'http://test.com/user' };
    store.getRepresentation.mockResolvedValue({ data: guardedStreamFrom([
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Write`)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}fakeMode1`)),
    ]) } as Representation);
    Object.assign(authorization.everyone, { read: true, write: true, append: true, control: false });
    Object.assign(authorization.user, { read: true, write: true, append: true, control: false });
    await expect(authorizer.handle({ identifier, modes, credentials })).resolves.toEqual(authorization);
  });

  it('allows access if the acl file allows all agents.', async(): Promise<void> => {
    store.getRepresentation.mockResolvedValue({ data: guardedStreamFrom([
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth'), nn(`${acl}agentClass`), nn('http://xmlns.com/foaf/0.1/Agent')),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Write`)),
    ]) } as Representation);
    Object.assign(authorization.everyone, { read: true, write: true, append: true });
    Object.assign(authorization.user, { read: true, write: true, append: true });
    await expect(authorizer.handle({ identifier, modes, credentials })).resolves.toEqual(authorization);
  });

  it('allows access if there is a parent acl file allowing all agents.', async(): Promise<void> => {
    store.getRepresentation.mockImplementation(async(id: ResourceIdentifier): Promise<Representation> => {
      if (id.path.endsWith('foo.acl')) {
        throw new NotFoundHttpError();
      }
      return {
        data: guardedStreamFrom([
          quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
          quad(nn('auth'), nn(`${acl}agentClass`), nn('http://xmlns.com/foaf/0.1/Agent')),
          quad(nn('auth'), nn(`${acl}default`), nn(identifierStrategy.getParentContainer(identifier).path)),
          quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
          quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Write`)),
        ]),
      } as Representation;
    });
    Object.assign(authorization.everyone, { read: true, write: true, append: true });
    Object.assign(authorization.user, { read: true, write: true, append: true });
    await expect(authorizer.handle({ identifier, modes, credentials })).resolves.toEqual(authorization);
  });

  it('throws a ForbiddenHttpError if access is not granted and credentials have a WebID.', async(): Promise<void> => {
    accessChecker.handleSafe.mockResolvedValue(false);
    store.getRepresentation.mockResolvedValue({ data: guardedStreamFrom([
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
    ]) } as Representation);
    credentials.agent = { webId: 'http://test.com/alice/profile/card#me' };
    await expect(authorizer.handle({ identifier, modes, credentials })).rejects.toThrow(ForbiddenHttpError);
  });

  it('throws an UnauthorizedHttpError if access is not granted there are no credentials.', async(): Promise<void> => {
    credentials = {};
    accessChecker.handleSafe.mockResolvedValue(false);
    store.getRepresentation.mockResolvedValue({ data: guardedStreamFrom([
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
    ]) } as Representation);
    await expect(authorizer.handle({ identifier, modes, credentials })).rejects.toThrow(UnauthorizedHttpError);
  });

  it('re-throws ResourceStore errors as internal errors.', async(): Promise<void> => {
    store.getRepresentation.mockRejectedValue(new Error('TEST!'));
    const promise = authorizer.handle({ identifier, modes, credentials });
    await expect(promise).rejects.toThrow(`Error reading ACL for ${identifier.path}: TEST!`);
    await expect(promise).rejects.toThrow(InternalServerError);
  });

  it('errors if the root container has no corresponding acl document.', async(): Promise<void> => {
    store.getRepresentation.mockRejectedValue(new NotFoundHttpError());
    const promise = authorizer.handle({ identifier, modes, credentials });
    await expect(promise).rejects.toThrow('No ACL document found for root container');
    await expect(promise).rejects.toThrow(ForbiddenHttpError);
  });

  it('allows an agent to append if they have write access.', async(): Promise<void> => {
    modes = new Set([ AccessMode.append ]);
    store.getRepresentation.mockResolvedValue({ data: guardedStreamFrom([
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Write`)),
    ]) } as Representation);
    Object.assign(authorization.everyone, { write: true, append: true });
    Object.assign(authorization.user, { write: true, append: true });
    await expect(authorizer.handle({ identifier, modes, credentials })).resolves.toEqual(authorization);
  });
});
