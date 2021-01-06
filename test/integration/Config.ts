import { mkdirSync } from 'fs';
import { Loader } from 'componentsjs';
import * as rimraf from 'rimraf';
import { joinFilePath, toSystemFilePath } from '../../src/util/PathUtil';

export const BASE = 'http://test.com';

/**
 * Returns a component instantiated from a Components.js configuration.
 */
export async function instantiateFromConfig(componentUrl: string, configFile: string,
  variables?: Record<string, any>): Promise<any> {
  // Initialize the Components.js loader
  const mainModulePath = joinFilePath(__dirname, '../../');
  const loader = new Loader({ mainModulePath });
  await loader.registerAvailableModuleResources();

  // Instantiate the component from the config
  const configPath = toSystemFilePath(joinFilePath(__dirname, 'config', configFile));
  return loader.instantiateFromUrl(componentUrl, configPath, undefined, { variables });
}

export function getTestFolder(name: string): string {
  return joinFilePath(__dirname, '../tmp', name);
}

export function createFolder(folder: string): void {
  mkdirSync(folder, { recursive: true });
}

export function removeFolder(folder: string): void {
  rimraf.sync(folder, { glob: false });
}
