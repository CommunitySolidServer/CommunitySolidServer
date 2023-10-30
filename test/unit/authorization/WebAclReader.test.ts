import { DataFactory } from 'n3';
import type { Credentials } from '../../../src/authentication/Credentials';
import type { AccessChecker } from '../../../src/authorization/access/AccessChecker';
import type { PermissionReaderInput } from '../../../src/authorization/PermissionReader';
import { AclMode } from '../../../src/authorization/permissions/AclPermissionSet';
import type { AccessMap, PermissionSet } from '../../../src/authorization/permissions/Permissions';
import { AccessMode } from '../../../src/authorization/permissions/Permissions';
import { WebAclReader } from '../../../src/authorization/WebAclReader';
import type { AuxiliaryIdentifierStrategy } from '../../../src/http/auxiliary/AuxiliaryIdentifierStrategy';
import { BasicRepresentation } from '../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../src/http/representation/Representation';
import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import type { ResourceSet } from '../../../src/storage/ResourceSet';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { INTERNAL_QUADS } from '../../../src/util/ContentTypes';
import { ForbiddenHttpError } from '../../../src/util/errors/ForbiddenHttpError';
import { InternalServerError } from '../../../src/util/errors/InternalServerError';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';
import { SingleRootIdentifierStrategy } from '../../../src/util/identifiers/SingleRootIdentifierStrategy';
import { IdentifierMap, IdentifierSetMultiMap } from '../../../src/util/map/IdentifierMap';
import { compareMaps } from '../../util/Util';

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
  let resourceSet: jest.Mocked<ResourceSet>;
  let store: jest.Mocked<ResourceStore>;
  const identifierStrategy = new SingleRootIdentifierStrategy('http://example.com/');
  let credentials: Credentials;
  let identifier: ResourceIdentifier;
  let accessMap: AccessMap;
  let input: PermissionReaderInput;
  let accessChecker: jest.Mocked<AccessChecker>;

  beforeEach(async(): Promise<void> => {
    credentials = { agent: { webId: 'http://example.com/#me' }};
    identifier = { path: 'http://example.com/foo' };

    accessMap = new IdentifierSetMultiMap([
      [ identifier, AccessMode.read ],
      [ identifier, AccessMode.write ],
      [ identifier, AccessMode.append ],
      [ identifier, AclMode.control ] as any,
    ]);

    input = { credentials, requestedModes: accessMap };

    resourceSet = {
      hasResource: jest.fn().mockResolvedValue(true),
    };

    store = {
      getRepresentation: jest.fn().mockResolvedValue(new BasicRepresentation([
        quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      ], INTERNAL_QUADS)),
    } as any;

    accessChecker = {
      handleSafe: jest.fn().mockResolvedValue(true),
    } as any;

    reader = new WebAclReader(aclStrategy, resourceSet, store, identifierStrategy, accessChecker);
  });

  it('handles all input.', async(): Promise<void> => {
    await expect(reader.canHandle({} as any)).resolves.toBeUndefined();
  });

  it('returns undefined permissions for undefined credentials.', async(): Promise<void> => {
    input.credentials = {};
    compareMaps(await reader.handle(input), new IdentifierMap([[ identifier, {}]]));
  });

  it('reads the accessTo value of the acl resource.', async(): Promise<void> => {
    credentials.agent = { webId: 'http://test.com/user' };
    store.getRepresentation.mockResolvedValue(new BasicRepresentation([
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
    ], INTERNAL_QUADS));
    compareMaps(await reader.handle(input), new IdentifierMap([[ identifier, { read: true }]]));
  });

  it('ignores accessTo fields pointing to different resources.', async(): Promise<void> => {
    credentials.agent = { webId: 'http://test.com/user' };
    store.getRepresentation.mockResolvedValue(new BasicRepresentation([
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth'), nn(`${acl}accessTo`), nn('somewhereElse')),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
    ], INTERNAL_QUADS));
    compareMaps(await reader.handle(input), new IdentifierMap([[ identifier, {}]]));
  });

  it('handles all valid modes and ignores other ones.', async(): Promise<void> => {
    credentials.agent = { webId: 'http://test.com/user' };
    store.getRepresentation.mockResolvedValue(new BasicRepresentation([
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}fakeMode1`)),
    ], INTERNAL_QUADS));
    compareMaps(await reader.handle(input), new IdentifierMap([[ identifier, { read: true }]]));
  });

  it('reads the default value of a parent if there is no direct acl resource.', async(): Promise<void> => {
    resourceSet.hasResource.mockImplementation(async(id): Promise<boolean> => !id.path.endsWith('foo.acl'));
    store.getRepresentation.mockResolvedValue(new BasicRepresentation([
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth'), nn(`${acl}agentClass`), nn('http://xmlns.com/foaf/0.1/Agent')),
      quad(nn('auth'), nn(`${acl}default`), nn(identifierStrategy.getParentContainer(identifier).path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
    ], INTERNAL_QUADS));
    compareMaps(await reader.handle(input), new IdentifierMap([[ identifier, { read: true }]]));
  });

  it('does not use default authorizations for the resource itself.', async(): Promise<void> => {
    store.getRepresentation.mockResolvedValue(new BasicRepresentation([
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth'), nn(`${acl}agentClass`), nn('http://xmlns.com/foaf/0.1/Agent')),
      quad(nn('auth'), nn(`${acl}default`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
      quad(nn('auth2'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth2'), nn(`${acl}agentClass`), nn('http://xmlns.com/foaf/0.1/Agent')),
      quad(nn('auth2'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth2'), nn(`${acl}mode`), nn(`${acl}Append`)),
    ], INTERNAL_QUADS));
    compareMaps(await reader.handle(input), new IdentifierMap([[ identifier, { append: true }]]));
  });

  it('re-throws ResourceStore errors as internal errors.', async(): Promise<void> => {
    store.getRepresentation.mockRejectedValue(new Error('TEST!'));
    const promise = reader.handle(input);
    await expect(promise).rejects.toThrow(`Error reading ACL resource ${identifier.path}.acl: TEST!`);
    await expect(promise).rejects.toThrow(InternalServerError);
  });

  it('errors if the root container has no corresponding acl document.', async(): Promise<void> => {
    resourceSet.hasResource.mockResolvedValue(false);
    const promise = reader.handle(input);
    await expect(promise).rejects.toThrow('No ACL document found for root container');
    await expect(promise).rejects.toThrow(ForbiddenHttpError);
  });

  it('ignores rules where no access is granted.', async(): Promise<void> => {
    credentials.agent = { webId: 'http://test.com/user' };
    accessChecker.handleSafe.mockImplementation(async({ rule }): Promise<boolean> => rule.value !== 'auth1');

    store.getRepresentation.mockResolvedValue(new BasicRepresentation([
      quad(nn('auth1'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth1'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth1'), nn(`${acl}mode`), nn(`${acl}Read`)),
      quad(nn('auth2'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth2'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth2'), nn(`${acl}mode`), nn(`${acl}Append`)),
    ], INTERNAL_QUADS));

    compareMaps(await reader.handle(input), new IdentifierMap<PermissionSet>([[ identifier, { append: true }]]));
  });

  it('combines ACL representation requests for resources when possible.', async(): Promise<void> => {
    const identifier2 = { path: 'http://example.com/bar/' };
    const identifier3 = { path: 'http://example.com/bar/baz' };

    resourceSet.hasResource.mockImplementation(async(id): Promise<boolean> =>
      id.path === 'http://example.com/.acl' || id.path === 'http://example.com/bar/.acl');

    store.getRepresentation.mockImplementation(async(id: ResourceIdentifier): Promise<Representation> => {
      if (id.path === 'http://example.com/.acl') {
        return new BasicRepresentation([
          quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
          quad(nn('auth'), nn(`${acl}agentClass`), nn('http://xmlns.com/foaf/0.1/Agent')),
          quad(nn('auth'), nn(`${acl}default`), nn('http://example.com/')),
          quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
        ], INTERNAL_QUADS);
      }
      if (id.path === 'http://example.com/bar/.acl') {
        return new BasicRepresentation([
          quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
          quad(nn('auth'), nn(`${acl}agentClass`), nn('http://xmlns.com/foaf/0.1/Agent')),
          quad(nn('auth'), nn(`${acl}default`), nn(identifier2.path)),
          quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Append`)),
          quad(nn('auth2'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
          quad(nn('auth2'), nn(`${acl}agentClass`), nn('http://xmlns.com/foaf/0.1/Agent')),
          quad(nn('auth2'), nn(`${acl}accessTo`), nn(identifier2.path)),
          quad(nn('auth2'), nn(`${acl}mode`), nn(`${acl}Read`)),
        ], INTERNAL_QUADS);
      }
      throw new NotFoundHttpError();
    });

    input.requestedModes.set(identifier2, new Set([ AccessMode.read ]));
    input.requestedModes.set(identifier3, new Set([ AccessMode.append ]));

    compareMaps(await reader.handle(input), new IdentifierMap([
      [ identifier, { read: true }],
      [ identifier2, { read: true }],
      [ identifier3, { append: true }],
    ]));
    // http://example.com/.acl and http://example.com/bar/.acl
    expect(store.getRepresentation).toHaveBeenCalledTimes(2);
  });
});
