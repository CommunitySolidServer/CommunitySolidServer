import { getLoggerFor } from '../../logging/LogUtil';
import type { KeyValueStorage } from '../../storage/keyvalue/KeyValueStorage';
import type { ResourceStore } from '../../storage/ResourceStore';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { ConflictHttpError } from '../../util/errors/ConflictHttpError';
import { joinFilePath } from '../../util/PathUtil';
import type { PodSettings } from '../settings/PodSettings';
import type { ComponentsJsFactory } from './ComponentsJsFactory';
import type { PodGenerator } from './PodGenerator';
import type { VariableHandler } from './variables/VariableHandler';
import { isValidVariable, TEMPLATE, TEMPLATE_VARIABLE } from './variables/Variables';

const DEFAULT_CONFIG_PATH = joinFilePath(__dirname, '../../../templates/config/');

/**
 * Creates a new ResourceStore when creating a pod based on a Components.js configuration.
 *
 * Part of the dynamic pod creation.
 *  1. It calls a VariableHandler to add necessary variable values.
 *     E.g. setting the base url variable for components.js to the pod identifier.
 *  2. It filters/cleans the input agent values using {@link VariableHandler}s
 *  3. It calls a ComponentsJsFactory with the variables and template location to instantiate a new ResourceStore.
 *  4. It stores these values in the configuration storage, which is used as a permanent storage for pod configurations.
 *
 * @see {@link ConfigPodManager}, {@link ConfigPodInitializer}, {@link BaseUrlRouterRule}
 */
export class TemplatedPodGenerator implements PodGenerator {
  protected readonly logger = getLoggerFor(this);
  private readonly storeFactory: ComponentsJsFactory;
  private readonly variableHandler: VariableHandler;
  private readonly configStorage: KeyValueStorage<string, unknown>;
  private readonly configTemplatePath: string;
  private readonly baseUrl: string;

  /**
   * @param storeFactory - Factory used for Components.js instantiation.
   * @param variableHandler - Handler used for setting variable values.
   * @param configStorage - Where to store the configuration values to instantiate the store for this pod.
   * @param baseUrl - Base URL of the server.
   * @param configTemplatePath - Where to find the configuration templates.
   */
  public constructor(
    storeFactory: ComponentsJsFactory,
    variableHandler: VariableHandler,
    configStorage: KeyValueStorage<string, unknown>,
    baseUrl: string,
    configTemplatePath?: string,
  ) {
    this.storeFactory = storeFactory;
    this.variableHandler = variableHandler;
    this.configStorage = configStorage;
    this.baseUrl = baseUrl;
    this.configTemplatePath = configTemplatePath ?? DEFAULT_CONFIG_PATH;
  }

  public async generate(settings: PodSettings): Promise<ResourceStore> {
    const identifier = settings.base;
    if (!settings.template) {
      throw new BadRequestHttpError('Settings require template field.');
    }

    if (await this.configStorage.has(identifier.path)) {
      this.logger.warn(`There already is a pod at ${identifier.path}`);
      throw new ConflictHttpError(`There already is a pod at ${identifier.path}`);
    }

    await this.variableHandler.handleSafe({ identifier, settings });

    // Filter out irrelevant data in the agent
    const variables: NodeJS.Dict<unknown> = {};
    for (const key of Object.keys(settings)) {
      if (isValidVariable(key)) {
        variables[key] = settings[key];
      }
    }

    // Prevent unsafe template names
    if (!/^[a-zA-Z0-9.-]+$/u.test(settings.template)) {
      this.logger.warn(`Invalid template name ${settings.template}`);
      throw new BadRequestHttpError(`Invalid template name ${settings.template}`);
    }
    // Storing the template in the variables so it also gets stored in the config for later re-use
    variables[TEMPLATE_VARIABLE.templateConfig] = joinFilePath(this.configTemplatePath, settings.template);

    const store: ResourceStore =
      await this.storeFactory.generate(
        variables[TEMPLATE_VARIABLE.templateConfig] as string,
        TEMPLATE.ResourceStore,
        // eslint-disable-next-line ts/naming-convention
        { ...variables, 'urn:solid-server:default:variable:baseUrl': this.baseUrl },
      );
    this.logger.debug(`Generating store ${identifier.path} with variables ${JSON.stringify(variables)}`);

    // Store the variables permanently
    await this.configStorage.set(identifier.path, variables);

    return store;
  }
}
