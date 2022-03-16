import type { JsonInteractionHandler } from '../../../../src/identity/interaction/JsonInteractionHandler';
import { VersionHandler } from '../../../../src/identity/interaction/VersionHandler';

describe('A VersionHandler', (): void => {
  let source: jest.Mocked<JsonInteractionHandler>;
  let handler: VersionHandler;

  beforeEach(async(): Promise<void> => {
    source = {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue({ json: { data: 'data' }}),
    } as any;

    handler = new VersionHandler(source);
  });

  it('can handle input its source can handle.', async(): Promise<void> => {
    await expect(handler.canHandle({} as any)).resolves.toBeUndefined();

    const error = new Error('bad data');
    source.canHandle.mockRejectedValueOnce(error);
    await expect(handler.canHandle({} as any)).rejects.toThrow(error);
  });

  it('adds the API version to the output.', async(): Promise<void> => {
    await expect(handler.handle({} as any)).resolves.toEqual({ json: {
      data: 'data',
      version: '0.5',
    }});
  });
});
