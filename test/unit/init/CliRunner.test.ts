import * as Path from 'path';
import type { Loader } from 'componentsjs';
import { runCli } from '../../../src/init/CliRunner';
import type { Setup } from '../../../src/init/Setup';

let calledInstantiateFromUrl: boolean;
let calledRegisterAvailableModuleResources: boolean;
let throwError: boolean;
let outsideResolve: () => void;
let functionToResolve: Promise<unknown>;

const mockSetup = {
  setup: jest.fn(),
} as unknown as jest.Mocked<Setup>;

// Mock the Loader class.
jest.mock('componentsjs', (): any => (
  // eslint-disable-next-line @typescript-eslint/naming-convention, object-shorthand
  { Loader: function(): Loader {
    return {
      instantiateFromUrl(): any {
        calledInstantiateFromUrl = true;
        if (throwError) {
          throw new Error('Error! :o');
        }
        return mockSetup;
      },
      registerAvailableModuleResources(): any {
        calledRegisterAvailableModuleResources = true;
      },
    } as unknown as Loader;
  } }
));

jest.mock('yargs', (): any => ({
  usage(): any {
    return this;
  },
  options(): any {
    return this;
  },
  help(): any {
    // Return once with and once without config value so that both branches are tested.
    if (throwError) {
      return {
        argv: { config: 'value' },
      };
    }
    return {
      argv: { },
    };
  },
}));

describe('CliRunner', (): void => {
  beforeAll(async(): Promise<void> => {
    mockSetup.setup.mockImplementation(async(): Promise<any> => {
      // The info method will be called when all other code has been executed, so end the waiting function.
      outsideResolve();
    });
  });

  beforeEach(async(): Promise<void> => {
    calledInstantiateFromUrl = false;
    calledRegisterAvailableModuleResources = false;
    throwError = false;

    // Initialize a function that will be resolved as soon as all necessary but asynchronous calls are completed.
    functionToResolve = new Promise((resolve): any => {
      outsideResolve = resolve;
    });
  });

  it('Runs function for starting the server from the command line.', async(): Promise<void> => {
    runCli(Path.join(__dirname, '..'));

    await functionToResolve;

    expect(calledInstantiateFromUrl).toBeTruthy();
    expect(calledRegisterAvailableModuleResources).toBeTruthy();
    expect(mockSetup.setup).toHaveBeenCalledTimes(1);
  });

  it('Writes to stderr when an exception occurs.', async(): Promise<void> => {
    const mockStderr = jest.spyOn(process.stderr, 'write').mockImplementation((): any => {
      // This method will be called when an error has occurred, so end the waiting function.
      outsideResolve();
    });
    throwError = true;

    runCli(Path.join(__dirname, '..'));

    await functionToResolve;

    expect(mockStderr).toHaveBeenCalledTimes(1);
    mockStderr.mockRestore();
  });
});
