import type { IComponentsManagerBuilderOptions, LogLevel } from 'componentsjs';
import { ComponentsManager } from 'componentsjs';
import { joinFilePath } from '../../util/PathUtil';
import type { ComponentsJsFactory } from './ComponentsJsFactory';

/**
 * Can be used to instantiate objects using Components.js.
 * Default main module path is the root folder of the project.
 * For every generate call a new manager will be made,
 * but moduleState will be stored in between calls.
 */
export class BaseComponentsJsFactory implements ComponentsJsFactory {
  private readonly options: IComponentsManagerBuilderOptions<unknown>;

  public constructor(relativeModulePath = '../../../', logLevel = 'error') {
    this.options = {
      mainModulePath: joinFilePath(__dirname, relativeModulePath),
      logLevel: logLevel as LogLevel,
      dumpErrorState: false,
      typeChecking: false,
    };
  }

  private async buildManager(): Promise<ComponentsManager<unknown>> {
    const manager = await ComponentsManager.build(this.options);
    this.options.moduleState = manager.moduleState;
    return manager;
  }

  /**
   * Calls Components.js to instantiate a new object.
   *
   * @param configPath - Location of the config to instantiate.
   * @param componentIri - Iri of the object in the config that will be the result.
   * @param variables - Variables to send to Components.js
   *
   * @returns The resulting object, corresponding to the given component IRI.
   */
  public async generate<T>(configPath: string, componentIri: string, variables: Record<string, unknown>):
  Promise<T> {
    const manager = await this.buildManager();
    await manager.configRegistry.register(configPath);
    return manager.instantiate(componentIri, { variables });
  }
}
