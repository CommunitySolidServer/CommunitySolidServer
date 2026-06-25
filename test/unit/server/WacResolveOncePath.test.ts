import 'jest-rdf';
import { DataFactory } from 'n3';
import type { Credentials } from '../../../src/authentication/Credentials';
import type { CredentialsExtractor } from '../../../src/authentication/CredentialsExtractor';
import type { AccessChecker } from '../../../src/authorization/access/AccessChecker';
import { AuxiliaryReader } from '../../../src/authorization/AuxiliaryReader';
import type { Authorizer } from '../../../src/authorization/Authorizer';
import { PermissionBasedAuthorizer } from '../../../src/authorization/PermissionBasedAuthorizer';
import { UnionPermissionReader } from '../../../src/authorization/UnionPermissionReader';
import { WebAclReader } from '../../../src/authorization/WebAclReader';
import { AclMode } from '../../../src/authorization/permissions/AclPermissionSet';
import type { ModesExtractor } from '../../../src/authorization/permissions/ModesExtractor';
import type { AccessMap } from '../../../src/authorization/permissions/Permissions';
import { AccessMode } from '../../../src/authorization/permissions/Permissions';
import type { AuxiliaryIdentifierStrategy } from '../../../src/http/auxiliary/AuxiliaryIdentifierStrategy';
import type { AuxiliaryStrategy } from '../../../src/http/auxiliary/AuxiliaryStrategy';
import type { Operation } from '../../../src/http/Operation';
import { OkResponseDescription } from '../../../src/http/output/response/OkResponseDescription';
import { BasicRepresentation } from '../../../src/http/representation/BasicRepresentation';
import { RepresentationMetadata } from '../../../src/http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import { AuthorizingHttpHandler } from '../../../src/server/AuthorizingHttpHandler';
import type { HttpRequest } from '../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../src/server/HttpResponse';
import type { OperationHttpHandler } from '../../../src/server/OperationHttpHandler';
import { WacAllowHttpHandler } from '../../../src/server/WacAllowHttpHandler';
import type { ResourceSet } from '../../../src/storage/ResourceSet';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { INTERNAL_QUADS } from '../../../src/util/ContentTypes';
import { CachedHandler } from '../../../src/util/handlers/CachedHandler';
import { SingleRootIdentifierStrategy } from '../../../src/util/identifiers/SingleRootIdentifierStrategy';
import { IdentifierSetMultiMap } from '../../../src/util/map/IdentifierMap';
import { ACL, AUTH } from '../../../src/util/Vocabularies';

const { namedNode: nn, quad } = DataFactory;
const acl = 'http://www.w3.org/ns/auth/acl#';
const rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';

/**
 * Drives the REAL AuthorizingHttpHandler -> WacAllowHttpHandler -> OperationHandler chain
 * over the REAL cached reader stack (CachedHandler -> AuxiliaryReader -> UnionPermissionReader -> WebAclReader)
 * and counts how many times the effective `.acl` is resolved (read) for a single request,
 * just as production does. CredentialsExtractor/ModesExtractor are cached on (request)/(operation)
 * exactly like production, so the WAC-Allow user pass HITs the reader cache.
 */
describe('Full auth + WAC-Allow request path: effective .acl resolution count', (): void => {
  const target: ResourceIdentifier = { path: 'http://example.com/foo' };
  const aclStrategy: AuxiliaryIdentifierStrategy = {
    getAuxiliaryIdentifier: (id: ResourceIdentifier): ResourceIdentifier => ({ path: `${id.path}.acl` }),
    isAuxiliaryIdentifier: (id: ResourceIdentifier): boolean => id.path.endsWith('.acl'),
    getSubjectIdentifier: (id: ResourceIdentifier): ResourceIdentifier => ({ path: id.path.slice(0, -4) }),
  } as any;
  const identifierStrategy = new SingleRootIdentifierStrategy('http://example.com/');

  let aclReads: string[];
  let store: jest.Mocked<ResourceStore>;
  let resourceSet: jest.Mocked<ResourceSet>;
  let accessChecker: jest.Mocked<AccessChecker>;
  let auxiliaryStrategy: jest.Mocked<AuxiliaryStrategy>;
  let permissionReader: CachedHandler<any, any>;

  const request: HttpRequest = {} as any;
  const response: HttpResponse = {} as any;

  // Build a cached credentials extractor keyed on the request object (production behaviour).
  function cachedCredentials(creds: Credentials): jest.Mocked<CredentialsExtractor> {
    const cache = new WeakMap<object, Credentials>();
    return {
      handleSafe: jest.fn().mockImplementation(async(req: object): Promise<Credentials> => {
        let value = cache.get(req);
        if (!value) {
          value = creds;
          cache.set(req, value);
        }
        return value;
      }),
    } as any;
  }

  function cachedModes(modes: AccessMap): jest.Mocked<ModesExtractor> {
    const cache = new WeakMap<object, AccessMap>();
    return {
      handleSafe: jest.fn().mockImplementation(async(op: object): Promise<AccessMap> => {
        let value = cache.get(op);
        if (!value) {
          value = modes;
          cache.set(op, value);
        }
        return value;
      }),
    } as any;
  }

  beforeEach((): void => {
    aclReads = [];
    resourceSet = { hasResource: jest.fn().mockResolvedValue(true) } as any;
    store = {
      getRepresentation: jest.fn().mockImplementation(async(id: ResourceIdentifier): Promise<BasicRepresentation> => {
        aclReads.push(id.path);
        return new BasicRepresentation([
          quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
          quad(nn('auth'), nn(`${acl}accessTo`), nn(target.path)),
          quad(nn('auth'), nn(`${acl}agentClass`), nn('http://xmlns.com/foaf/0.1/Agent')),
          quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
          quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Write`)),
          quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Control`)),
        ], INTERNAL_QUADS);
      }),
    } as any;
    accessChecker = { handleSafe: jest.fn().mockResolvedValue(true) } as any;
    auxiliaryStrategy = {
      isAuxiliaryIdentifier: jest.fn().mockReturnValue(false),
      usesOwnAuthorization: jest.fn().mockReturnValue(false),
      getSubjectIdentifier: jest.fn(),
    } as any;

    const webAcl = new WebAclReader(aclStrategy, resourceSet, store, identifierStrategy, accessChecker);
    const union = new UnionPermissionReader([ webAcl ]);
    const aux = new AuxiliaryReader(union, auxiliaryStrategy);
    permissionReader = new CachedHandler(aux as any, [ 'credentials', 'requestedModes' ]);
  });

  function buildOperation(): Operation {
    return { target, method: 'GET', preferences: {}, body: new BasicRepresentation() };
  }

  function buildModes(): AccessMap {
    return new IdentifierSetMultiMap<any>([
      [ target, AccessMode.read ],
      [ target, AclMode.control ],
    ]);
  }

  function buildChain(creds: Credentials, modes: AccessMap): {
    handler: AuthorizingHttpHandler;
    authorizer: Authorizer;
  } {
    const credentialsExtractor = cachedCredentials(creds);
    const modesExtractor = cachedModes(modes);
    const authorizer = new PermissionBasedAuthorizer(resourceSet);
    const okOutput = new OkResponseDescription(new RepresentationMetadata());
    const finalHandler: OperationHttpHandler = { handleSafe: jest.fn().mockResolvedValue(okOutput) } as any;
    const wacAllow = new WacAllowHttpHandler({
      credentialsExtractor,
      modesExtractor,
      permissionReader: permissionReader as any,
      operationHandler: finalHandler,
    });
    const handler = new AuthorizingHttpHandler({
      credentialsExtractor,
      modesExtractor,
      permissionReader: permissionReader as any,
      authorizer,
      operationHandler: wacAllow,
    });
    return { handler, authorizer };
  }

  it('AUTHENTICATED GET resolves the effective .acl exactly ONCE across auth + WAC-Allow.', async(): Promise<void> => {
    const { handler } = buildChain({ agent: { webId: 'http://example.com/#me' }}, buildModes());
    const result = await handler.handle({ operation: buildOperation(), request, response });

    // The redundant second resolution (the WAC-Allow public pass) is gone: 2 -> 1.
    expect(aclReads).toEqual([ 'http://example.com/foo.acl' ]);

    // WAC-Allow header is byte-identical: the ACL grants foaf:Agent Read/Write/Control, and
    // acl:Write maps to both append+write, so user and public both list Read/Append/Write/Control.
    const expected = [ ACL.terms.Read, ACL.terms.Append, ACL.terms.Write, ACL.terms.Control ];
    expect(result.metadata!.getAll(AUTH.terms.userMode)).toEqualRdfTermArray(expected);
    expect(result.metadata!.getAll(AUTH.terms.publicMode)).toEqualRdfTermArray(expected);
  });

  it('UNAUTHENTICATED GET resolves the effective .acl exactly once.', async(): Promise<void> => {
    const { handler } = buildChain({}, buildModes());
    const result = await handler.handle({ operation: buildOperation(), request, response });
    expect(aclReads).toEqual([ 'http://example.com/foo.acl' ]);
    // Public == user for an unauthenticated request.
    const expected = [ ACL.terms.Read, ACL.terms.Append, ACL.terms.Write, ACL.terms.Control ];
    expect(result.metadata!.getAll(AUTH.terms.userMode)).toEqualRdfTermArray(expected);
    expect(result.metadata!.getAll(AUTH.terms.publicMode)).toEqualRdfTermArray(expected);
  });

  it('PUT resolves the effective .acl exactly once (no WAC-Allow).', async(): Promise<void> => {
    const modes = new IdentifierSetMultiMap<any>([[ target, AccessMode.write ]]);
    const { handler } = buildChain({ agent: { webId: 'http://example.com/#me' }}, modes);
    const op = buildOperation();
    op.method = 'PUT';
    await handler.handle({ operation: op, request, response });
    expect(aclReads).toEqual([ 'http://example.com/foo.acl' ]);
  });
});
