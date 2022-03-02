import { BasicRepresentation } from '../../../src/http/representation/BasicRepresentation';
import { ControlHandler } from '../../../src/identity/interaction/ControlHandler';
import type { InteractionHandler, InteractionHandlerInput } from '../../../src/identity/interaction/InteractionHandler';
import type { InteractionRoute } from '../../../src/identity/interaction/routing/InteractionRoute';
import { APPLICATION_JSON } from '../../../src/util/ContentTypes';
import { InternalServerError } from '../../../src/util/errors/InternalServerError';
import { readJsonStream } from '../../../src/util/StreamUtil';

describe('A ControlHandler', (): void => {
  const input: InteractionHandlerInput = {} as any;
  let controls: Record<string, jest.Mocked<InteractionRoute>>;
  let source: jest.Mocked<InteractionHandler>;
  let handler: ControlHandler;

  beforeEach(async(): Promise<void> => {
    controls = {
      login: { getPath: jest.fn().mockReturnValue('http://example.com/login/') } as any,
      register: { getPath: jest.fn().mockReturnValue('http://example.com/register/') } as any,
    };

    source = {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue(new BasicRepresentation(JSON.stringify({ data: 'data' }), APPLICATION_JSON)),
    } as any;

    handler = new ControlHandler(source, controls);
  });

  it('can handle any input its source can handle.', async(): Promise<void> => {
    await expect(handler.canHandle(input)).resolves.toBeUndefined();

    source.canHandle.mockRejectedValueOnce(new Error('bad data'));
    await expect(handler.canHandle(input)).rejects.toThrow('bad data');
  });

  it('errors in case its source does not return JSON.', async(): Promise<void> => {
    source.handle.mockResolvedValueOnce(new BasicRepresentation());
    await expect(handler.handle(input)).rejects.toThrow(InternalServerError);
  });

  it('adds controls to the source response.', async(): Promise<void> => {
    const result = await handler.handle(input);
    await expect(readJsonStream(result.data)).resolves.toEqual({
      data: 'data',
      apiVersion: '0.3',
      controls: {
        login: 'http://example.com/login/',
        register: 'http://example.com/register/',
      },
    });
  });
});
