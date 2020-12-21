import { mkdirSync } from 'fs';
import { join } from 'path';
import * as Path from 'path';
import { Loader } from 'componentsjs';
import * as rimraf from 'rimraf';

export const BASE = 'http://test.com';

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

export const getTestFolder = (name: string): string =>
  join(__dirname, '../tmp', name);

export const createFolder = (folder: string): void => {
  mkdirSync(folder, { recursive: true });
};

export const removeFolder = (folder: string): void => {
  rimraf.sync(folder, { glob: false });
};
