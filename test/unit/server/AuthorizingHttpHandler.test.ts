import type { BlankNode } from 'n3';
import type { CredentialsExtractor } from '../../../src/authentication/CredentialsExtractor';
import type { Authorizer } from '../../../src/authorization/Authorizer';
import type { PermissionReader } from '../../../src/authorization/PermissionReader';
import type { ModesExtractor } from '../../../src/authorization/permissions/ModesExtractor';
import type { AccessMap, PermissionMap } from '../../../src/authorization/permissions/Permissions';
import { AccessMode } from '../../../src/authorization/permissions/Permissions';
import type { Operation } from '../../../src/http/Operation';
import { BasicRepresentation } from '../../../src/http/representation/BasicRepresentation';
import { AuthorizingHttpHandler } from '../../../src/server/AuthorizingHttpHandler';
import type { HttpRequest } from '../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../src/server/HttpResponse';
import type { OperationHttpHandler } from '../../../src/server/OperationHttpHandler';
import { ForbiddenHttpError } from '../../../src/util/errors/ForbiddenHttpError';
import { HttpError } from '../../../src/util/errors/HttpError';
import { IdentifierMap, IdentifierSetMultiMap } from '../../../src/util/map/IdentifierMap';
import { SOLID_META } from '../../../src/util/Vocabularies';

describe('An AuthorizingHttpHandler', (): void => {
  const credentials = {};
  const target = { path: 'http://example.com/foo' };
  const requestedModes: AccessMap = new IdentifierSetMultiMap<AccessMode>(
    [[ target, new Set([ AccessMode.read, AccessMode.write ]) ]],
  );
  const availablePermissions: PermissionMap = new IdentifierMap(
    [[ target, { read: true, write: true }]],
  );
  const request: HttpRequest = {} as any;
  const response: HttpResponse = {} as any;
  let operation: Operation;
  let credentialsExtractor: jest.Mocked<CredentialsExtractor>;
  let modesExtractor: jest.Mocked<ModesExtractor>;
  let permissionReader: jest.Mocked<PermissionReader>;
  let authorizer: jest.Mocked<Authorizer>;
  let source: jest.Mocked<OperationHttpHandler>;
  let handler: AuthorizingHttpHandler;

  beforeEach(async(): Promise<void> => {
    operation = {
      target,
      method: 'GET',
      preferences: {},
      body: new BasicRepresentation(),
    };

    credentialsExtractor = {
      handleSafe: jest.fn().mockResolvedValue(credentials),
    } as any;
    modesExtractor = {
      handleSafe: jest.fn().mockResolvedValue(requestedModes),
    } as any;
    permissionReader = {
      handleSafe: jest.fn().mockResolvedValue(availablePermissions),
    } as any;
    authorizer = {
      handleSafe: jest.fn(),
    } as any;
    source = {
      handleSafe: jest.fn(),
    } as any;

    handler = new AuthorizingHttpHandler(
      { credentialsExtractor, modesExtractor, permissionReader, authorizer, operationHandler: source },
    );
  });

  it('goes through all the steps and calls the source.', async(): Promise<void> => {
    await expect(handler.handle({ request, response, operation })).resolves.toBeUndefined();
    expect(credentialsExtractor.handleSafe).toHaveBeenCalledTimes(1);
    expect(credentialsExtractor.handleSafe).toHaveBeenLastCalledWith(request);
    expect(modesExtractor.handleSafe).toHaveBeenCalledTimes(1);
    expect(modesExtractor.handleSafe).toHaveBeenLastCalledWith(operation);
    expect(permissionReader.handleSafe).toHaveBeenCalledTimes(1);
    expect(permissionReader.handleSafe).toHaveBeenLastCalledWith({ credentials, requestedModes });
    expect(authorizer.handleSafe).toHaveBeenCalledTimes(1);
    expect(authorizer.handleSafe).toHaveBeenLastCalledWith({ credentials, requestedModes, availablePermissions });
    expect(source.handleSafe).toHaveBeenCalledTimes(1);
    expect(source.handleSafe).toHaveBeenLastCalledWith({ request, response, operation });
  });

  it('errors with added access modes if authorization fails.', async(): Promise<void> => {
    const error = new ForbiddenHttpError();
    authorizer.handleSafe.mockRejectedValueOnce(error);
    let handlerError: HttpError | undefined;
    try {
      await handler.handle({ request, response, operation });
    } catch (receivedError: unknown) {
      if (receivedError instanceof HttpError) {
        handlerError = receivedError;
      }
    }
    expect(handlerError).toBe(error);
    const [ bnode ] = handlerError?.metadata?.getAll(SOLID_META.terms.requestedAccess) ?? [];
    expect(bnode?.termType).toBe('BlankNode');
    const [ targetQuad ] = handlerError?.metadata?.quads(bnode as BlankNode, SOLID_META.terms.accessTarget) ?? [];
    expect(targetQuad.object.value).toBe(target.path);
    const modeQuads = handlerError?.metadata?.quads(bnode as BlankNode, SOLID_META.terms.accessMode) ?? [];
    const modes = modeQuads.map((quad): string => quad.object.value);
    expect(modes).toContain(AccessMode.read);
    expect(modes).toContain(AccessMode.write);
    expect(source.handleSafe).toHaveBeenCalledTimes(0);
  });
});
