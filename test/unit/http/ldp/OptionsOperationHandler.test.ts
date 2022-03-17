import { OptionsOperationHandler } from '../../../../src/http/ldp/OptionsOperationHandler';
import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import { BasicConditions } from '../../../../src/storage/BasicConditions';
import type { ResourceSet } from '../../../../src/storage/ResourceSet';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('An OptionsOperationHandler', (): void => {
  let operation: Operation;
  const conditions = new BasicConditions({});
  const preferences = {};
  const body = new BasicRepresentation();
  let resourceSet: jest.Mocked<ResourceSet>;
  let handler: OptionsOperationHandler;

  beforeEach(async(): Promise<void> => {
    operation = { method: 'OPTIONS', target: { path: 'http://test.com/foo' }, preferences, conditions, body };
    resourceSet = {
      hasResource: jest.fn().mockResolvedValue(true),
    };
    handler = new OptionsOperationHandler(resourceSet);
  });

  it('only supports Options operations.', async(): Promise<void> => {
    await expect(handler.canHandle({ operation })).resolves.toBeUndefined();
    operation.method = 'GET';
    await expect(handler.canHandle({ operation })).rejects.toThrow(NotImplementedHttpError);
    operation.method = 'HEAD';
    await expect(handler.canHandle({ operation })).rejects.toThrow(NotImplementedHttpError);
  });

  it('returns a 204 response.', async(): Promise<void> => {
    const result = await handler.handle({ operation });
    expect(result.statusCode).toBe(204);
    expect(result.metadata).toBeUndefined();
    expect(result.data).toBeUndefined();
  });

  it('returns a 404 if the target resource does not exist.', async(): Promise<void> => {
    resourceSet.hasResource.mockResolvedValueOnce(false);
    await expect(handler.handle({ operation })).rejects.toThrow(NotFoundHttpError);
  });
});
