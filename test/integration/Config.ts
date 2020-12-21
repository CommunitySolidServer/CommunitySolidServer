import { join } from 'path';
import * as Path from 'path';
import { Loader } from 'componentsjs';

export const BASE = 'http://test.com';

/**
 * Creates a RuntimeConfig with its rootFilePath set based on the given subfolder.
 * @param subfolder - Folder to use in the global testData folder.
 */
export const getRootFilePath = (subfolder: string): string => join(__dirname, '../testData', subfolder);

/**
 * Returns a component instantiated from a Components.js configuration.
 */
export const instantiateFromConfig = async(componentUrl: string, configFile: string,
  variables?: Record<string, any>): Promise<any> => {
  // Initialize the Components.js loader
  const mainModulePath = Path.join(__dirname, '../../');
  const loader = new Loader({ mainModulePath });
  await loader.registerAvailableModuleResources();

  // Instantiate the component from the config
  const configPath = Path.join(__dirname, configFile);
  return loader.instantiateFromUrl(componentUrl, configPath, undefined, { variables });
};
