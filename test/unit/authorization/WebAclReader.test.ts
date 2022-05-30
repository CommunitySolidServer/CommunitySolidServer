import { DataFactory } from 'n3';
import type { CredentialSet } from '../../../src/authentication/Credentials';
import { CredentialGroup } from '../../../src/authentication/Credentials';
import type { AccessChecker } from '../../../src/authorization/access/AccessChecker';
import type { PermissionReaderInput } from '../../../src/authorization/PermissionReader';
import { AclMode } from '../../../src/authorization/permissions/AclPermission';
import { AccessMode } from '../../../src/authorization/permissions/Permissions';
import { WebAclReader } from '../../../src/authorization/WebAclReader';
import type { AuxiliaryIdentifierStrategy } from '../../../src/http/auxiliary/AuxiliaryIdentifierStrategy';
import { BasicRepresentation } from '../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../src/http/representation/Representation';
import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { INTERNAL_QUADS } from '../../../src/util/ContentTypes';
import { ForbiddenHttpError } from '../../../src/util/errors/ForbiddenHttpError';
import { InternalServerError } from '../../../src/util/errors/InternalServerError';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';
import { SingleRootIdentifierStrategy } from '../../../src/util/identifiers/SingleRootIdentifierStrategy';
import { ensureTrailingSlash } from '../../../src/util/PathUtil';
import { guardedStreamFrom } from '../../../src/util/StreamUtil';

const { namedNode: nn, quad } = DataFactory;

const acl = 'http://www.w3.org/ns/auth/acl#';
const rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';

describe('A WebAclReader', (): void => {
  let reader: WebAclReader;
  const aclStrategy: AuxiliaryIdentifierStrategy = {
    getAuxiliaryIdentifier: (id: ResourceIdentifier): ResourceIdentifier => ({ path: `${id.path}.acl` }),
    isAuxiliaryIdentifier: (id: ResourceIdentifier): boolean => id.path.endsWith('.acl'),
    getSubjectIdentifier: (id: ResourceIdentifier): ResourceIdentifier => ({ path: id.path.slice(0, -4) }),
  } as any;
  let store: jest.Mocked<ResourceStore>;
  const identifierStrategy = new SingleRootIdentifierStrategy('http://test.com/');
  let credentials: CredentialSet;
  let identifier: ResourceIdentifier;
  let modes: Set<AccessMode>;
  let input: PermissionReaderInput;
  let accessChecker: jest.Mocked<AccessChecker>;

  beforeEach(async(): Promise<void> => {
    credentials = { [CredentialGroup.public]: {}, [CredentialGroup.agent]: {}};
    identifier = { path: 'http://test.com/foo' };

    modes = new Set<AccessMode | AclMode>([
      AccessMode.read, AccessMode.write, AccessMode.append, AclMode.control,
    ]) as Set<AccessMode>;

    input = { credentials, identifier, modes };

    store = {
      getRepresentation: jest.fn().mockResolvedValue(new BasicRepresentation([
        quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      ], INTERNAL_QUADS)),
    } as any;

    accessChecker = {
      handleSafe: jest.fn().mockResolvedValue(true),
    } as any;

    reader = new WebAclReader(aclStrategy, store, identifierStrategy, accessChecker);
  });

  it('handles all input.', async(): Promise<void> => {
    await expect(reader.canHandle({ } as any)).resolves.toBeUndefined();
  });

  it('returns undefined permissions for undefined credentials.', async(): Promise<void> => {
    input.credentials = {};
    await expect(reader.handle(input)).resolves.toEqual({
      [CredentialGroup.public]: {},
      [CredentialGroup.agent]: {},
    });
  });

  it('reads the accessTo value of the acl resource.', async(): Promise<void> => {
    credentials.agent = { webId: 'http://test.com/user' };
    store.getRepresentation.mockResolvedValue({ data: guardedStreamFrom([
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
    ]) } as Representation);
    await expect(reader.handle(input)).resolves.toEqual({
      [CredentialGroup.public]: { read: true },
      [CredentialGroup.agent]: { read: true },
    });
  });

  it('ignores accessTo fields pointing to different resources.', async(): Promise<void> => {
    credentials.agent = { webId: 'http://test.com/user' };
    store.getRepresentation.mockResolvedValue({ data: guardedStreamFrom([
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth'), nn(`${acl}accessTo`), nn('somewhereElse')),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
    ]) } as Representation);
    await expect(reader.handle(input)).resolves.toEqual({
      [CredentialGroup.public]: {},
      [CredentialGroup.agent]: {},
    });
  });

  it('handles all valid modes and ignores other ones.', async(): Promise<void> => {
    credentials.agent = { webId: 'http://test.com/user' };
    store.getRepresentation.mockResolvedValue({ data: guardedStreamFrom([
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}fakeMode1`)),
    ]) } as Representation);
    await expect(reader.handle(input)).resolves.toEqual({
      [CredentialGroup.public]: { read: true },
      [CredentialGroup.agent]: { read: true },
    });
  });

  it('reads the default value of a parent if there is no direct acl resource.', async(): Promise<void> => {
    store.getRepresentation.mockImplementation(async(id: ResourceIdentifier): Promise<Representation> => {
      if (id.path.endsWith('foo.acl')) {
        throw new NotFoundHttpError();
      }
      return new BasicRepresentation([
        quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
        quad(nn('auth'), nn(`${acl}agentClass`), nn('http://xmlns.com/foaf/0.1/Agent')),
        quad(nn('auth'), nn(`${acl}default`), nn(identifierStrategy.getParentContainer(identifier).path)),
        quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
      ], INTERNAL_QUADS);
    });
    await expect(reader.handle(input)).resolves.toEqual({
      [CredentialGroup.public]: { read: true },
      [CredentialGroup.agent]: { read: true },
    });
  });

  it('does not use default authorizations for the resource itself.', async(): Promise<void> => {
    input.identifier = { path: ensureTrailingSlash(input.identifier.path) };
    store.getRepresentation.mockImplementation(async(): Promise<Representation> =>
      new BasicRepresentation([
        quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
        quad(nn('auth'), nn(`${acl}agentClass`), nn('http://xmlns.com/foaf/0.1/Agent')),
        quad(nn('auth'), nn(`${acl}default`), nn(input.identifier.path)),
        quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
        quad(nn('auth2'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
        quad(nn('auth2'), nn(`${acl}agentClass`), nn('http://xmlns.com/foaf/0.1/Agent')),
        quad(nn('auth2'), nn(`${acl}accessTo`), nn(input.identifier.path)),
        quad(nn('auth2'), nn(`${acl}mode`), nn(`${acl}Append`)),
      ], INTERNAL_QUADS));
    await expect(reader.handle(input)).resolves.toEqual({
      [CredentialGroup.public]: { append: true },
      [CredentialGroup.agent]: { append: true },
    });
  });

  it('re-throws ResourceStore errors as internal errors.', async(): Promise<void> => {
    store.getRepresentation.mockRejectedValue(new Error('TEST!'));
    const promise = reader.handle(input);
    await expect(promise).rejects.toThrow(`Error reading ACL for ${identifier.path}: TEST!`);
    await expect(promise).rejects.toThrow(InternalServerError);
  });

  it('errors if the root container has no corresponding acl document.', async(): Promise<void> => {
    store.getRepresentation.mockRejectedValue(new NotFoundHttpError());
    const promise = reader.handle(input);
    await expect(promise).rejects.toThrow('No ACL document found for root container');
    await expect(promise).rejects.toThrow(ForbiddenHttpError);
  });

  it('allows an agent to append/create/delete if they have write access.', async(): Promise<void> => {
    store.getRepresentation.mockResolvedValue({ data: guardedStreamFrom([
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Write`)),
    ]) } as Representation);
    await expect(reader.handle(input)).resolves.toEqual({
      [CredentialGroup.public]: { write: true, append: true, create: true, delete: true },
      [CredentialGroup.agent]: { write: true, append: true, create: true, delete: true },
    });
  });

  it('allows everything on an acl resource if control permissions are granted.', async(): Promise<void> => {
    store.getRepresentation.mockResolvedValue({ data: guardedStreamFrom([
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Control`)),
    ]) } as Representation);
    input.identifier = { path: `${identifier.path}.acl` };
    await expect(reader.handle(input)).resolves.toEqual({
      [CredentialGroup.public]: { read: true, write: true, append: true, create: true, delete: true, control: true },
      [CredentialGroup.agent]: { read: true, write: true, append: true, create: true, delete: true, control: true },
    });
  });

  it('rejects everything on an acl resource if there are no control permissions.', async(): Promise<void> => {
    store.getRepresentation.mockResolvedValue({ data: guardedStreamFrom([
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
    ]) } as Representation);
    input.identifier = { path: `${identifier.path}.acl` };
    await expect(reader.handle(input)).resolves.toEqual({
      [CredentialGroup.public]: {},
      [CredentialGroup.agent]: {},
    });
  });

  it('ignores rules where no access is granted.', async(): Promise<void> => {
    credentials.agent = { webId: 'http://test.com/user' };
    // CredentialGroup.public gets true on auth1, CredentialGroup.agent on auth2
    accessChecker.handleSafe.mockImplementation(async({ rule, credential: cred }): Promise<boolean> =>
      (rule.value === 'auth1') === !cred.webId);

    store.getRepresentation.mockResolvedValue({ data: guardedStreamFrom([
      quad(nn('auth1'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth1'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth1'), nn(`${acl}mode`), nn(`${acl}Read`)),
      quad(nn('auth2'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth2'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth2'), nn(`${acl}mode`), nn(`${acl}Control`)),
    ]) } as Representation);

    await expect(reader.handle(input)).resolves.toEqual({
      [CredentialGroup.public]: { read: true },
      [CredentialGroup.agent]: { control: true },
    });
  });

  it('requires append permissions on the parent container to create resources.', async(): Promise<void> => {
    store.getRepresentation.mockImplementation(async(id): Promise<Representation> => {
      const subject = id.path.slice(0, -4);
      if (subject === input.identifier.path) {
        throw new NotFoundHttpError();
      }
      return new BasicRepresentation([
        quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
        quad(nn('auth'), nn(`${acl}accessTo`), nn(subject)),
        quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Append`)),
      ], 'internal/quads');
    });
    input.modes.add(AccessMode.create);

    await expect(reader.handle(input)).resolves.toEqual({
      [CredentialGroup.public]: { create: true },
      [CredentialGroup.agent]: { create: true },
    });
  });

  it('requires write permissions on the parent container to delete resources.', async(): Promise<void> => {
    store.getRepresentation.mockImplementation(async(id): Promise<Representation> => new BasicRepresentation([
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(id.path.slice(0, -4))),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Write`)),
    ], 'internal/quads'));
    input.modes.add(AccessMode.delete);

    await expect(reader.handle(input)).resolves.toEqual({
      [CredentialGroup.public]: { append: true, write: true, delete: true, create: true },
      [CredentialGroup.agent]: { append: true, write: true, delete: true, create: true },
    });
  });

  it('can use the same acl resource for both target and parent.', async(): Promise<void> => {
    store.getRepresentation.mockImplementation(async(id): Promise<Representation> => {
      const subject = id.path.slice(0, -4);
      if (subject === input.identifier.path) {
        throw new NotFoundHttpError();
      }
      return new BasicRepresentation([
        quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
        quad(nn('auth'), nn(`${acl}accessTo`), nn(subject)),
        quad(nn('auth'), nn(`${acl}default`), nn(subject)),
        quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Write`)),
      ], 'internal/quads');
    });
    input.modes.add(AccessMode.create);

    await expect(reader.handle(input)).resolves.toEqual({
      [CredentialGroup.public]: { append: true, write: true, delete: true, create: true },
      [CredentialGroup.agent]: { append: true, write: true, delete: true, create: true },
    });
  });

  it('does not grant create permission if the parent does not have append rights.', async(): Promise<void> => {
    store.getRepresentation.mockImplementation(async(id): Promise<Representation> => {
      const subject = id.path.slice(0, -4);
      if (subject === input.identifier.path) {
        throw new NotFoundHttpError();
      }
      return new BasicRepresentation([
        quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
        quad(nn('auth'), nn(`${acl}default`), nn(subject)),
        quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Write`)),
        quad(nn('auth2'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
        quad(nn('auth2'), nn(`${acl}accessTo`), nn(subject)),
        quad(nn('auth2'), nn(`${acl}mode`), nn(`${acl}Read`)),
      ], 'internal/quads');
    });
    input.modes.add(AccessMode.create);

    await expect(reader.handle(input)).resolves.toEqual({
      [CredentialGroup.public]: { append: true, write: true },
      [CredentialGroup.agent]: { append: true, write: true },
    });
  });

  it('can use a grandparent acl resource for both target and parent.', async(): Promise<void> => {
    input.identifier = { path: 'http://test.com/foo/bar/' };
    store.getRepresentation.mockImplementation(async(id): Promise<Representation> => {
      const subject = id.path.slice(0, -4);
      if (subject !== 'http://test.com/') {
        throw new NotFoundHttpError();
      }
      return new BasicRepresentation([
        quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
        quad(nn('auth'), nn(`${acl}default`), nn(subject)),
        quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Write`)),
      ], 'internal/quads');
    });
    input.modes.add(AccessMode.create);

    await expect(reader.handle(input)).resolves.toEqual({
      [CredentialGroup.public]: { append: true, write: true, delete: true, create: true },
      [CredentialGroup.agent]: { append: true, write: true, delete: true, create: true },
    });
  });
});
