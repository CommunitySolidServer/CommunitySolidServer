import 'jest-rdf';
import type { CredentialsExtractor } from '../../../src/authentication/CredentialsExtractor';
import type { PermissionReader } from '../../../src/authorization/PermissionReader';
import type { ModesExtractor } from '../../../src/authorization/permissions/ModesExtractor';
import type { Operation } from '../../../src/http/Operation';
import { OkResponseDescription } from '../../../src/http/output/response/OkResponseDescription';
import { ResponseDescription } from '../../../src/http/output/response/ResponseDescription';
import { BasicRepresentation } from '../../../src/http/representation/BasicRepresentation';
import { RepresentationMetadata } from '../../../src/http/representation/RepresentationMetadata';
import type { HttpRequest } from '../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../src/server/HttpResponse';
import type { OperationHttpHandler } from '../../../src/server/OperationHttpHandler';
import { WacAllowHttpHandler } from '../../../src/server/WacAllowHttpHandler';
import { NotModifiedHttpError } from '../../../src/util/errors/NotModifiedHttpError';
import { IdentifierMap, IdentifierSetMultiMap } from '../../../src/util/map/IdentifierMap';
import { ACL, AUTH } from '../../../src/util/Vocabularies';

describe('A WacAllowHttpHandler', (): void => {
  const target = { path: 'http://example.com/foo' };
  const request: HttpRequest = {} as any;
  const response: HttpResponse = {} as any;
  let output: ResponseDescription;
  let operation: Operation;
  let credentialsExtractor: jest.Mocked<CredentialsExtractor>;
  let modesExtractor: jest.Mocked<ModesExtractor>;
  let permissionReader: jest.Mocked<PermissionReader>;
  let source: jest.Mocked<OperationHttpHandler>;
  let handler: WacAllowHttpHandler;

  beforeEach(async(): Promise<void> => {
    output = new OkResponseDescription(new RepresentationMetadata());

    operation = {
      target,
      method: 'GET',
      preferences: {},
      body: new BasicRepresentation(),
    };

    credentialsExtractor = {
      handleSafe: jest.fn().mockResolvedValue({}),
    } as any;
    modesExtractor = {
      handleSafe: jest.fn().mockResolvedValue(new IdentifierSetMultiMap()),
    } as any;
    permissionReader = {
      handleSafe: jest.fn().mockResolvedValue(new IdentifierMap()),
    } as any;
    source = {
      handleSafe: jest.fn().mockResolvedValue(output),
    } as any;

    handler = new WacAllowHttpHandler(
      { credentialsExtractor, modesExtractor, permissionReader, operationHandler: source },
    );
  });

  it('adds permission metadata.', async(): Promise<void> => {
    permissionReader.handleSafe.mockResolvedValueOnce(new IdentifierMap(
      [[ target, { read: true, write: true, append: false }]],
    ));

    await expect(handler.handle({ operation, request, response })).resolves.toEqual(output);
    expect(output.metadata!.quads()).toHaveLength(4);
    expect(output.metadata!.getAll(AUTH.terms.userMode)).toEqualRdfTermArray([ ACL.terms.Read, ACL.terms.Write ]);
    expect(output.metadata!.getAll(AUTH.terms.publicMode)).toEqualRdfTermArray([ ACL.terms.Read, ACL.terms.Write ]);

    expect(source.handleSafe).toHaveBeenCalledTimes(1);
    expect(source.handleSafe).toHaveBeenLastCalledWith({ operation, request, response });
    expect(credentialsExtractor.handleSafe).toHaveBeenCalledTimes(1);
    expect(credentialsExtractor.handleSafe).toHaveBeenLastCalledWith(request);
    expect(modesExtractor.handleSafe).toHaveBeenCalledTimes(1);
    expect(modesExtractor.handleSafe).toHaveBeenLastCalledWith(operation);
    expect(permissionReader.handleSafe).toHaveBeenCalledTimes(1);
    expect(permissionReader.handleSafe).toHaveBeenLastCalledWith({
      credentials: await credentialsExtractor.handleSafe.mock.results[0].value,
      requestedModes: await modesExtractor.handleSafe.mock.results[0].value,
    });
  });

  it('adds permission metadata for 304 responses.', async(): Promise<void> => {
    permissionReader.handleSafe.mockResolvedValueOnce(new IdentifierMap(
      [[ target, { read: true, write: true, append: false }]],
    ));

    source.handleSafe.mockRejectedValueOnce(new NotModifiedHttpError());
    let error: unknown;
    try {
      await handler.handle({ operation, request, response });
    } catch (err: unknown) {
      error = err;
    }
    expect(NotModifiedHttpError.isInstance(error)).toBe(true);
    expect((error as NotModifiedHttpError).metadata.getAll(AUTH.terms.userMode))
      .toEqualRdfTermArray([ ACL.terms.Read, ACL.terms.Write ]);
    expect((error as NotModifiedHttpError).metadata.getAll(AUTH.terms.publicMode))
      .toEqualRdfTermArray([ ACL.terms.Read, ACL.terms.Write ]);

    expect(source.handleSafe).toHaveBeenCalledTimes(1);
    expect(source.handleSafe).toHaveBeenLastCalledWith({ operation, request, response });
    expect(credentialsExtractor.handleSafe).toHaveBeenCalledTimes(1);
    expect(credentialsExtractor.handleSafe).toHaveBeenLastCalledWith(request);
    expect(modesExtractor.handleSafe).toHaveBeenCalledTimes(1);
    expect(modesExtractor.handleSafe).toHaveBeenLastCalledWith(operation);
    expect(permissionReader.handleSafe).toHaveBeenCalledTimes(1);
    expect(permissionReader.handleSafe).toHaveBeenLastCalledWith({
      credentials: await credentialsExtractor.handleSafe.mock.results[0].value,
      requestedModes: await modesExtractor.handleSafe.mock.results[0].value,
    });
  });

  it('rethrows errors.', async(): Promise<void> => {
    const error = new Error('bad data');
    source.handleSafe.mockRejectedValueOnce(error);
    await expect(handler.handle({ operation, request, response })).rejects.toThrow(error);
  });

  it('determines public permissions separately in case of an authenticated request.', async(): Promise<void> => {
    credentialsExtractor.handleSafe.mockResolvedValue({ agent: { webId: 'http://example.com/#me' }});
    permissionReader.handleSafe.mockResolvedValueOnce(new IdentifierMap(
      [[ target, { read: true, write: true, append: false }]],
    ));
    permissionReader.handleSafe.mockResolvedValueOnce(new IdentifierMap(
      [[ target, { read: true, write: false, append: true }]],
    ));

    await expect(handler.handle({ operation, request, response })).resolves.toEqual(output);
    expect(output.metadata!.quads()).toHaveLength(4);
    expect(output.metadata!.getAll(AUTH.terms.userMode)).toEqualRdfTermArray([ ACL.terms.Read, ACL.terms.Write ]);
    expect(output.metadata!.getAll(AUTH.terms.publicMode)).toEqualRdfTermArray([ ACL.terms.Read, ACL.terms.Append ]);

    expect(source.handleSafe).toHaveBeenCalledTimes(1);
    expect(source.handleSafe).toHaveBeenLastCalledWith({ operation, request, response });
    expect(credentialsExtractor.handleSafe).toHaveBeenCalledTimes(1);
    expect(credentialsExtractor.handleSafe).toHaveBeenLastCalledWith(request);
    expect(modesExtractor.handleSafe).toHaveBeenCalledTimes(1);
    expect(modesExtractor.handleSafe).toHaveBeenLastCalledWith(operation);
    expect(permissionReader.handleSafe).toHaveBeenCalledTimes(2);
    expect(permissionReader.handleSafe).toHaveBeenNthCalledWith(1, {
      credentials: { agent: { webId: 'http://example.com/#me' }},
      requestedModes: await modesExtractor.handleSafe.mock.results[0].value,
    });
    expect(permissionReader.handleSafe).toHaveBeenNthCalledWith(2, {
      credentials: {},
      requestedModes: await modesExtractor.handleSafe.mock.results[0].value,
    });
  });

  it('adds no permissions if none of them are on the target.', async(): Promise<void> => {
    permissionReader.handleSafe.mockResolvedValueOnce(new IdentifierMap(
      [[{ path: 'http://example/other' }, { read: true, write: false }]],
    ));

    await expect(handler.handle({ operation, request, response })).resolves.toEqual(output);
    expect(output.metadata!.quads()).toHaveLength(0);
  });

  it('adds no public permissions if the second call has no results for the target.', async(): Promise<void> => {
    credentialsExtractor.handleSafe.mockResolvedValue({ agent: { webId: 'http://example.com/#me' }});
    permissionReader.handleSafe.mockResolvedValueOnce(new IdentifierMap(
      [[ target, { read: true, write: false }]],
    ));
    permissionReader.handleSafe.mockResolvedValueOnce(new IdentifierMap(
      [[{ path: 'http://example/other' }, { read: false, write: true }]],
    ));

    await expect(handler.handle({ operation, request, response })).resolves.toEqual(output);
    expect(output.metadata!.quads()).toHaveLength(1);
    expect(output.metadata!.getAll(AUTH.terms.userMode)).toEqualRdfTermArray([ ACL.terms.Read ]);
    expect(output.metadata!.getAll(AUTH.terms.publicMode)).toEqualRdfTermArray([]);
  });

  it('immediately returns the source output if the operation method is not GET or HEAD.', async(): Promise<void> => {
    operation.method = 'DELETE';
    await expect(handler.handle({ operation, request, response })).resolves.toEqual(output);
    expect(source.handleSafe).toHaveBeenCalledTimes(1);
    expect(credentialsExtractor.handleSafe).toHaveBeenCalledTimes(0);
    expect(modesExtractor.handleSafe).toHaveBeenCalledTimes(0);
    expect(permissionReader.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('immediately returns the source output if the output response has no metadata.', async(): Promise<void> => {
    output = new ResponseDescription(200);
    source.handleSafe.mockResolvedValue(output);
    await expect(handler.handle({ operation, request, response })).resolves.toEqual(output);
    expect(source.handleSafe).toHaveBeenCalledTimes(1);
    expect(credentialsExtractor.handleSafe).toHaveBeenCalledTimes(0);
    expect(modesExtractor.handleSafe).toHaveBeenCalledTimes(0);
    expect(permissionReader.handleSafe).toHaveBeenCalledTimes(0);
  });
});
