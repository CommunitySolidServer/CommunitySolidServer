import { ControlHandler } from '../../../../src/identity/interaction/ControlHandler';
import type {
  JsonInteractionHandler,
  JsonInteractionHandlerInput,
} from '../../../../src/identity/interaction/JsonInteractionHandler';
import type { InteractionRoute } from '../../../../src/identity/interaction/routing/InteractionRoute';

describe('A ControlHandler', (): void => {
  const input: JsonInteractionHandlerInput = {} as any;
  let controls: Record<string, InteractionRoute | JsonInteractionHandler>;
  let source: jest.Mocked<JsonInteractionHandler>;
  let handler: ControlHandler;

  beforeEach(async(): Promise<void> => {
    controls = {
      login: { getPath: jest.fn().mockReturnValue('http://example.com/login/') } as any,
      register: { getPath: jest.fn().mockReturnValue('http://example.com/register/') } as any,
    };

    source = {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue({ json: { data: 'data' }}),
    } as any;

    handler = new ControlHandler(controls, source);
  });

  it('can handle any input its source can handle if there is one.', async(): Promise<void> => {
    await expect(handler.canHandle(input)).resolves.toBeUndefined();

    source.canHandle.mockRejectedValue(new Error('bad data'));
    await expect(handler.canHandle(input)).rejects.toThrow('bad data');

    handler = new ControlHandler(controls);
    await expect(handler.canHandle(input)).resolves.toBeUndefined();
  });

  it('adds controls to the source response in the key field.', async(): Promise<void> => {
    await expect(handler.handle(input)).resolves.toEqual({ json: {
      data: 'data',
      login: 'http://example.com/login/',
      register: 'http://example.com/register/',
    }});
  });

  it('can have handlers instead of routes as control values.', async(): Promise<void> => {
    controls.handler = {
      handleSafe: jest.fn().mockResolvedValue({ json: {
        key1: 'path1',
        key2: 'path2',
      }}),
    } as any;
    await expect(handler.handle(input)).resolves.toEqual({ json: {
      data: 'data',
      login: 'http://example.com/login/',
      handler: {
        key1: 'path1',
        key2: 'path2',
      },
      register: 'http://example.com/register/',
    }});
  });

  it('does not add route results if getting the path fails.', async(): Promise<void> => {
    controls.account = {
      getPath: jest.fn((): never => {
        throw new Error('missing account ID');
      }),
    } as any;
    await expect(handler.handle(input)).resolves.toEqual({ json: {
      data: 'data',
      login: 'http://example.com/login/',
      register: 'http://example.com/register/',
    }});
  });

  it('does not add handler results if it returns an empty array.', async(): Promise<void> => {
    controls.array = {
      handleSafe: jest.fn().mockResolvedValue({ json: []}),
    } as any;
    await expect(handler.handle(input)).resolves.toEqual({ json: {
      data: 'data',
      login: 'http://example.com/login/',
      register: 'http://example.com/register/',
    }});
  });

  it('does not add handler results if it returns an empty object.', async(): Promise<void> => {
    controls.object = {
      handleSafe: jest.fn().mockResolvedValue({ json: {}}),
    } as any;
    await expect(handler.handle(input)).resolves.toEqual({ json: {
      data: 'data',
      login: 'http://example.com/login/',
      register: 'http://example.com/register/',
    }});
  });

  it('merges results with controls.', async(): Promise<void> => {
    source.handle.mockResolvedValueOnce({ json: {
      data: 'data1',
      arr: [ 'arr1' ],
      arr2: [ 'arr1' ],
      obj: {
        key1: 'val1',
      },
      obj2: {
        key1: 'val1',
      },
    }});

    controls = {
      data: { getPath: jest.fn().mockReturnValue('data2') } as any,
      arr: { getPath: jest.fn().mockReturnValue([ 'arr2' ]) } as any,
      arr2: { getPath: jest.fn().mockReturnValue({ key2: 'val2' }) } as any,
      obj: { getPath: jest.fn().mockReturnValue({ key2: 'val2' }) } as any,
      obj2: { getPath: jest.fn().mockReturnValue([ 'moreData2' ]) } as any,
    };

    handler = new ControlHandler(controls, source);
    await expect(handler.handle(input)).resolves.toEqual({ json: {
      data: 'data1',
      arr: [ 'arr1', 'arr2' ],
      arr2: [ 'arr1' ],
      obj: {
        key1: 'val1',
        key2: 'val2',
      },
      obj2: {
        key1: 'val1',
      },
    }});
  });
});
