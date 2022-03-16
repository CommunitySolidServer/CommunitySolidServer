import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../src/http/representation/Representation';
import type { Interaction } from '../../../../src/identity/interaction/InteractionHandler';
import { JsonConversionHandler } from '../../../../src/identity/interaction/JsonConversionHandler';
import type { JsonInteractionHandler } from '../../../../src/identity/interaction/JsonInteractionHandler';
import type { RepresentationConverter } from '../../../../src/storage/conversion/RepresentationConverter';
import { APPLICATION_JSON } from '../../../../src/util/ContentTypes';
import { readJsonStream } from '../../../../src/util/StreamUtil';

describe('A JsonConversionHandler', (): void => {
  const accountId = 'accountId';
  const oidcInteraction: Interaction = { returnTo: 'returnTo' } as any;
  let convertedRepresentation: Representation;
  let operation: Operation;
  let source: jest.Mocked<JsonInteractionHandler>;
  let converter: jest.Mocked<RepresentationConverter>;
  let handler: JsonConversionHandler;

  beforeEach(async(): Promise<void> => {
    operation = {
      method: 'GET',
      target: { path: 'http://test.com/idp' },
      preferences: { type: { 'application/json': 1 }},
      body: new BasicRepresentation('{ "input": "data" }', 'application/json'),
    };

    source = {
      canHandle: jest.fn(),
      handle: jest.fn(),
      handleSafe: jest.fn().mockResolvedValue({ json: { output: 'data' }}),
    };

    converter = {
      canHandle: jest.fn(),
      handle: jest.fn(async(input): Promise<Representation> => {
        convertedRepresentation = new BasicRepresentation(input.representation.data, 'application/json');
        return convertedRepresentation;
      }),
      handleSafe: jest.fn(),
    };

    handler = new JsonConversionHandler(source, converter);
  });

  it('only handle representations its converter can handle.', async(): Promise<void> => {
    await expect(handler.canHandle({ operation, accountId, oidcInteraction })).resolves.toBeUndefined();
    const error = new Error('bad data');
    converter.canHandle.mockRejectedValueOnce(error);
    await expect(handler.canHandle({ operation, accountId, oidcInteraction })).rejects.toThrow(error);
  });

  it('can always handle empty bodies.', async(): Promise<void> => {
    operation.body = new BasicRepresentation();
    const error = new Error('bad data');
    converter.canHandle.mockRejectedValueOnce(error);
    await expect(handler.canHandle({ operation, accountId, oidcInteraction })).resolves.toBeUndefined();
  });

  it('calls the source with the generated JSON and converts the output back.', async(): Promise<void> => {
    const output = await handler.handle({ operation, accountId, oidcInteraction });
    expect(output).toBeDefined();
    await expect(readJsonStream(output.data)).resolves.toEqual({ output: 'data' });
    expect(output.metadata.contentType).toBe('application/json');
    expect(converter.handle).toHaveBeenCalledTimes(1);
    expect(converter.handle).toHaveBeenLastCalledWith({
      identifier: operation.target,
      preferences: { type: { [APPLICATION_JSON]: 1 }},
      representation: operation.body,
    });
    expect(source.handleSafe).toHaveBeenCalledTimes(1);
    expect(source.handleSafe).toHaveBeenLastCalledWith({
      method: operation.method,
      target: operation.target,
      metadata: convertedRepresentation.metadata,
      json: { input: 'data' },
      oidcInteraction,
      accountId,
    });
  });

  it('does not call the converter if the body is empty.', async(): Promise<void> => {
    operation.body = new BasicRepresentation();
    const output = await handler.handle({ operation, accountId, oidcInteraction });
    expect(output).toBeDefined();
    await expect(readJsonStream(output.data)).resolves.toEqual({ output: 'data' });
    expect(output.metadata.contentType).toBe('application/json');
    expect(converter.handle).toHaveBeenCalledTimes(0);
    expect(source.handleSafe).toHaveBeenCalledTimes(1);
    expect(source.handleSafe).toHaveBeenLastCalledWith({
      method: operation.method,
      target: operation.target,
      metadata: operation.body.metadata,
      json: {},
      oidcInteraction,
      accountId,
    });
  });
});
