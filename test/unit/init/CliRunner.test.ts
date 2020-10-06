import * as Path from 'path';
import type { Loader } from 'componentsjs';
import { runCli } from '../../../src/init/CliRunner';
import type { Setup } from '../../../src/init/Setup';

let calledInstantiateFromUrl: boolean;
let calledRegisterAvailableModuleResources: boolean;

const mockSetup = {
  setup: jest.fn(),
} as unknown as jest.Mocked<Setup>;

// eslint-disable-next-line arrow-body-style
jest.mock('componentsjs', (): any => {
  return function(): Loader {
    return {
      instantiateFromUrl(): any {
        calledInstantiateFromUrl = true;
        return mockSetup;
      },
      registerAvailableModuleResources(): any {
        calledRegisterAvailableModuleResources = true;
      },
    } as unknown as Loader;
  };
});

describe('CliRunner', (): void => {
  beforeEach(async(): Promise<void> => {
    calledInstantiateFromUrl = false;
    calledRegisterAvailableModuleResources = false;
  });

  it('Runs function for starting the server from the command line.', async(): Promise<void> => {
    runCli(Path.join(__dirname, '..'));
    expect(calledInstantiateFromUrl).toBeTruthy();
    expect(calledRegisterAvailableModuleResources).toBeTruthy();
    expect(mockSetup.setup).toBeCalledTimes(1);
  });
});
