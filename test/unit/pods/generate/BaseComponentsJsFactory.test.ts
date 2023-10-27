import type { ComponentsManager } from 'componentsjs';
import { BaseComponentsJsFactory } from '../../../../src/pods/generate/BaseComponentsJsFactory';

const manager: jest.Mocked<ComponentsManager<any>> = {
  instantiate: jest.fn(async(): Promise<any> => 'store!'),
  configRegistry: {
    register: jest.fn(),
  },
} as any;

jest.mock('componentsjs', (): any => ({
  ComponentsManager: {
    build: jest.fn(async(): Promise<ComponentsManager<any>> => manager),
  },
}));

describe('A BaseComponentsJsFactory', (): void => {
  let factory: BaseComponentsJsFactory;
  const configPath = 'config!';
  const componentIri = 'componentIri!';
  const variables = {
    aa: 'b',
    cc: 'd',
  };

  beforeEach(async(): Promise<void> => {
    jest.clearAllMocks();
    factory = new BaseComponentsJsFactory();
  });

  it('calls Components.js with the given values.', async(): Promise<void> => {
    await expect(factory.generate(configPath, componentIri, variables)).resolves.toBe('store!');
    expect(manager.configRegistry.register).toHaveBeenCalledTimes(1);
    expect(manager.configRegistry.register).toHaveBeenLastCalledWith(configPath);
    expect(manager.instantiate).toHaveBeenCalledTimes(1);
    expect(manager.instantiate).toHaveBeenLastCalledWith(componentIri, { variables });
  });
});
