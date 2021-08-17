import { namedNode, quad } from '@rdfjs/data-model';
import type { RepresentationConverter } from '../../../src';
import { RdfToQuadConverter } from '../../../src';
import type { Credentials } from '../../../src/authentication/Credentials';
import { AgentAccessChecker } from '../../../src/authorization/access-checkers/AgentAccessChecker';
import { AgentClassAccessChecker } from '../../../src/authorization/access-checkers/AgentClassAccessChecker';
import { AgentGroupAccessChecker } from '../../../src/authorization/access-checkers/AgentGroupAccessChecker';
import { WebAclAuthorization } from '../../../src/authorization/WebAclAuthorization';
import { WebAclAuthorizer } from '../../../src/authorization/WebAclAuthorizer';
import type { AuxiliaryIdentifierStrategy } from '../../../src/ldp/auxiliary/AuxiliaryIdentifierStrategy';
import type { PermissionSet } from '../../../src/ldp/permissions/PermissionSet';
import type { Representation } from '../../../src/ldp/representation/Representation';
import type { ResourceIdentifier } from '../../../src/ldp/representation/ResourceIdentifier';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { BadRequestHttpError } from '../../../src/util/errors/BadRequestHttpError';
import { ForbiddenHttpError } from '../../../src/util/errors/ForbiddenHttpError';
import { InternalServerError } from '../../../src/util/errors/InternalServerError';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../../../src/util/errors/NotImplementedHttpError';
import { UnauthorizedHttpError } from '../../../src/util/errors/UnauthorizedHttpError';
import { fetchDataset } from '../../../src/util/FetchUtil';
import { BooleanHandler } from '../../../src/util/handlers/BooleanHandler';
import { SingleRootIdentifierStrategy } from '../../../src/util/identifiers/SingleRootIdentifierStrategy';
import { guardedStreamFrom } from '../../../src/util/StreamUtil';

const nn = namedNode;

const acl = 'http://www.w3.org/ns/auth/acl#';
const rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const vcard = 'http://www.w3.org/2006/vcard/ns#';

jest.mock('../../../src/util/FetchUtil');

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
  const converter: RepresentationConverter = new RdfToQuadConverter();
  const accessChecker = new BooleanHandler([
    new AgentAccessChecker(),
    new AgentClassAccessChecker(),
    new AgentGroupAccessChecker(converter),
  ]);

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
    authorizer = new WebAclAuthorizer(aclStrategy, store, identifierStrategy, accessChecker);
  });

  it('handles all non-acl inputs.', async(): Promise<void> => {
    authorizer = new WebAclAuthorizer(aclStrategy, null as any, identifierStrategy, accessChecker);
    await expect(authorizer.canHandle({ identifier } as any)).resolves.toBeUndefined();
    await expect(authorizer.canHandle({ identifier: aclStrategy.getAuxiliaryIdentifier(identifier) } as any))
      .rejects.toThrow(NotImplementedHttpError);
  });

  it('handles all valid modes and ignores other ones.', async(): Promise<void> => {
    credentials.webId = 'http://test.com/user';
    store.getRepresentation = async(): Promise<Representation> => ({ data: guardedStreamFrom([
      quad(nn('pubAuth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('pubAuth'), nn(`${acl}agentClass`), nn('http://xmlns.com/foaf/0.1/Agent')),
      quad(nn('pubAuth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('pubAuth'), nn(`${acl}mode`), nn(`${acl}Read`)),
      quad(nn('pubAuth'), nn(`${acl}mode`), nn(`${acl}fakeMode1`)),
      quad(nn('pubAuth'), nn(`${acl}mode`), nn(`${acl}Append`)),

      quad(nn('agentAuth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('agentAuth'), nn(`${acl}agent`), nn(credentials.webId!)),
      quad(nn('agentAuth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('agentAuth'), nn(`${acl}mode`), nn(`${acl}fakeMode2`)),
      quad(nn('agentAuth'), nn(`${acl}mode`), nn(`${acl}Write`)),
      quad(nn('agentAuth'), nn(`${acl}mode`), nn(`${acl}fakeMode3`)),
      quad(nn('agentAuth'), nn(`${acl}mode`), nn(`${acl}Control`)),
    ]) } as Representation);
    Object.assign(authorization.everyone, { read: true, write: false, append: true, control: false });
    Object.assign(authorization.user, { read: true, write: true, append: true, control: true });
    await expect(authorizer.handle({ identifier, permissions, credentials })).resolves.toEqual(authorization);
  });

  it('allows access if the acl file allows all agents.', async(): Promise<void> => {
    store.getRepresentation = async(): Promise<Representation> => ({ data: guardedStreamFrom([
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth'), nn(`${acl}agentClass`), nn('http://xmlns.com/foaf/0.1/Agent')),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Write`)),
    ]) } as Representation);
    Object.assign(authorization.everyone, { read: true, write: true, append: true });
    Object.assign(authorization.user, { read: true, write: true, append: true });
    await expect(authorizer.handle({ identifier, permissions, credentials })).resolves.toEqual(authorization);
  });

  it('allows access if there is a parent acl file allowing all agents.', async(): Promise<void> => {
    store.getRepresentation = async(id: ResourceIdentifier): Promise<Representation> => {
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
    };
    Object.assign(authorization.everyone, { read: true, write: true, append: true });
    Object.assign(authorization.user, { read: true, write: true, append: true });
    await expect(authorizer.handle({ identifier, permissions, credentials })).resolves.toEqual(authorization);
  });

  it('allows access to authorized agents if the acl files allows all authorized users.', async(): Promise<void> => {
    store.getRepresentation = async(): Promise<Representation> => ({ data: guardedStreamFrom([
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
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
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
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
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth'), nn(`${acl}agent`), nn(credentials.webId!)),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Write`)),
    ]) } as Representation);
    Object.assign(authorization.user, { read: true, write: true, append: true });
    await expect(authorizer.handle({ identifier, permissions, credentials })).resolves.toEqual(authorization);
  });

  it('allows access to a group of agents defined in a vCard group file.', async(): Promise<void> => {
    credentials.webId = 'http://test.com/user';
    (fetchDataset as jest.Mock).mockImplementation(async(): Promise<Representation> => ({ data: guardedStreamFrom([
      quad(nn('http://some.server.com/group#ATeam'), nn(`${rdf}type`), nn(`${vcard}Group`)),
      quad(nn('http://some.server.com/group#ATeam'), nn(`${vcard}hasUID`), nn('urn:uuid:8831CBAD-1111-2222-8563-F0F4787E5398:ABGroup')),
      quad(nn('http://some.server.com/group#ATeam'), nn(`${vcard}hasMember`), nn('https://bob.example.com/profile/card#me')),
      quad(nn('http://some.server.com/group#ATeam'), nn(`${vcard}hasMember`), nn('http://test.com/user')),
    ]) } as Representation));

    store.getRepresentation = async(): Promise<Representation> => ({ data: guardedStreamFrom([
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth'), nn(`${acl}agentGroup`), nn('http://some.server.com/group#ATeam')),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Write`)),
    ]) } as Representation);
    Object.assign(authorization.user, { read: true, write: true, append: true });
    await expect(authorizer.handle({ identifier, permissions, credentials })).resolves.toEqual(authorization);
  });

  it('errors if an agent is not listed in a vCard group file.', async(): Promise<void> => {
    credentials.webId = 'http://test.com/user';
    (fetchDataset as jest.Mock).mockImplementation(async(): Promise<Representation> => ({ data: guardedStreamFrom([
      quad(nn('http://some.server.com/group#ATeam'), nn(`${rdf}type`), nn(`${vcard}Group`)),
      quad(nn('http://some.server.com/group#ATeam'), nn(`${vcard}hasUID`), nn('urn:uuid:8831CBAD-1111-2222-8563-F0F4787E5398:ABGroup')),
      quad(nn('http://some.server.com/group#ATeam'), nn(`${vcard}hasMember`), nn('https://bob.example.com/profile/card#me')),
    ]) } as Representation));

    store.getRepresentation = async(): Promise<Representation> => ({ data: guardedStreamFrom([
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth'), nn(`${acl}agentGroup`), nn('http://some.server.com/group#ATeam')),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Write`)),
    ]) } as Representation);
    await expect(authorizer.handle({ identifier, permissions, credentials })).rejects.toThrow(ForbiddenHttpError);
  });

  it('errors if it is not able to fetch a vCard group file.', async(): Promise<void> => {
    credentials.webId = 'http://test.com/user';
    (fetchDataset as jest.Mock).mockImplementation(async(): Promise<Representation> => {
      throw new BadRequestHttpError('fetchDataset failed');
    });

    store.getRepresentation = async(): Promise<Representation> => ({ data: guardedStreamFrom([
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth'), nn(`${acl}agentGroup`), nn('http://some.server.com/group#ATeam')),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Write`)),
    ]) } as Representation);
    await expect(authorizer.handle({ identifier, permissions, credentials })).rejects.toThrow(ForbiddenHttpError);
  });

  it('errors if a specific agents wants to access files not assigned to them.', async(): Promise<void> => {
    credentials.webId = 'http://test.com/user';
    store.getRepresentation = async(): Promise<Representation> => ({ data: guardedStreamFrom([
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth'), nn(`${acl}agent`), nn('http://test.com/differentUser')),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Write`)),
    ]) } as Representation);
    await expect(authorizer.handle({ identifier, permissions, credentials })).rejects.toThrow(ForbiddenHttpError);
  });

  it('re-throws ResourceStore errors as internal errors.', async(): Promise<void> => {
    store.getRepresentation = async(): Promise<Representation> => {
      throw new Error('TEST!');
    };
    const promise = authorizer.handle({ identifier, permissions, credentials });
    await expect(promise).rejects.toThrow(`Error reading ACL for ${identifier.path}: TEST!`);
    await expect(promise).rejects.toThrow(InternalServerError);
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
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth'), nn(`${acl}agent`), nn(credentials.webId!)),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Write`)),
    ]) } as Representation);
    Object.assign(authorization.user, { write: true, append: true });
    await expect(authorizer.handle({ identifier, permissions, credentials })).resolves.toEqual(authorization);
  });
});
