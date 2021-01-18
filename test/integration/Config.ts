import { mkdirSync } from 'fs';
import type { IModuleState } from 'componentsjs';
import { ComponentsManager } from 'componentsjs';
import * as rimraf from 'rimraf';
import { joinFilePath } from '../../src/util/PathUtil';

export const BASE = 'http://test.com';
let cachedModuleState: IModuleState;

/**
 * Returns a component instantiated from a Components.js configuration.
 */
export async function instantiateFromConfig(componentUrl: string, configFile: string,
  variables?: Record<string, any>): Promise<any> {
  // Initialize the Components.js loader
  const mainModulePath = joinFilePath(__dirname, '../../');
  const manager = await ComponentsManager.build({ mainModulePath, logLevel: 'error', moduleState: cachedModuleState });
  cachedModuleState = manager.moduleState;

  // Instantiate the component from the config
  const configPath = joinFilePath(__dirname, 'config', configFile);
  await manager.configRegistry.register(configPath);
  return await manager.instantiate(componentUrl, { variables });
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
