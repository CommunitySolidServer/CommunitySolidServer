import type { IModuleState } from 'componentsjs';
import { ComponentsManager } from 'componentsjs';
import { remove } from 'fs-extra';
import { joinFilePath } from '../../src/util/PathUtil';

let cachedModuleState: IModuleState;

/**
 * Returns a component instantiated from a Components.js configuration.
 */
export async function instantiateFromConfig(
  componentUrl: string,
  configPaths: string | string[],
  variables?: Record<string, any>,
): Promise<any> {
  // Initialize the Components.js loader
  const mainModulePath = joinFilePath(__dirname, '../../');
  const manager = await ComponentsManager.build({
    mainModulePath,
    logLevel: 'error',
    moduleState: cachedModuleState,
    typeChecking: false,
  });
  cachedModuleState = manager.moduleState;

  if (!Array.isArray(configPaths)) {
    configPaths = [ configPaths ];
  }

  // Instantiate the component from the config(s)
  for (const configPath of configPaths) {
    await manager.configRegistry.register(configPath);
  }
  return manager.instantiate(componentUrl, { variables });
}

export function getTestConfigPath(configFile: string): string {
  return joinFilePath(__dirname, 'config', configFile);
}

export function getPresetConfigPath(configFile: string): string {
  return joinFilePath(__dirname, '../../config', configFile);
}

export function getTestFolder(name: string): string {
  return joinFilePath(__dirname, '../tmp', name);
}

export async function removeFolder(folder: string): Promise<void> {
  await remove(folder);
}

export function getDefaultVariables(port: number, baseUrl?: string): Record<string, any> {
  return {
    'urn:solid-server:default:variable:baseUrl': baseUrl ?? `http://localhost:${port}/`,
    'urn:solid-server:default:variable:port': port,
    'urn:solid-server:default:variable:socket': null,
    'urn:solid-server:default:variable:loggingLevel': 'off',
    'urn:solid-server:default:variable:showStackTrace': true,
    'urn:solid-server:default:variable:seedConfig': null,
    'urn:solid-server:default:variable:workers': 1,
    'urn:solid-server:default:variable:confirmMigration': false,
  };
}
