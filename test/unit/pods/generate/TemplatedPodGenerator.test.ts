import type { ComponentsJsFactory } from '../../../../src/pods/generate/ComponentsJsFactory';
import { TemplatedPodGenerator } from '../../../../src/pods/generate/TemplatedPodGenerator';
import type { VariableHandler } from '../../../../src/pods/generate/variables/VariableHandler';
import { TEMPLATE, TEMPLATE_VARIABLE } from '../../../../src/pods/generate/variables/Variables';
import type { PodSettings } from '../../../../src/pods/settings/PodSettings';
import type { KeyValueStorage } from '../../../../src/storage/keyvalue/KeyValueStorage';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { ConflictHttpError } from '../../../../src/util/errors/ConflictHttpError';
import { joinFilePath } from '../../../../src/util/PathUtil';

describe('A TemplatedPodGenerator', (): void => {
  const configTemplatePath = 'templates/config/';
  const template = 'config-template.json';
  const templatePath = `${configTemplatePath}${template}`;
  const identifier = { path: 'http://test.com/alice/' };
  const baseUrl = 'http://test.com';
  let settings: PodSettings;
  let storeFactory: ComponentsJsFactory;
  let variableHandler: VariableHandler;
  let configStorage: KeyValueStorage<string, unknown>;
  let generator: TemplatedPodGenerator;

  beforeEach(async(): Promise<void> => {
    settings = {
      base: identifier,
      webId: 'http://example.com/card#me',
      template,
    };

    storeFactory = {
      generate: jest.fn().mockResolvedValue('store'),
    } as any;

    variableHandler = {
      handleSafe: jest.fn(),
    } as any;

    configStorage = new Map<string, unknown>() as any;

    generator = new TemplatedPodGenerator(storeFactory, variableHandler, configStorage, baseUrl, configTemplatePath);
  });

  it('only supports settings with a template.', async(): Promise<void> => {
    (settings as any).template = undefined;
    await expect(generator.generate(settings)).rejects.toThrow(BadRequestHttpError);
  });

  it('generates a store and stores relevant variables.', async(): Promise<void> => {
    await expect(generator.generate(settings)).resolves.toBe('store');
    expect(variableHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(variableHandler.handleSafe).toHaveBeenLastCalledWith({ identifier, settings });
    expect(storeFactory.generate).toHaveBeenCalledTimes(1);
    expect(storeFactory.generate)
      .toHaveBeenLastCalledWith(templatePath, TEMPLATE.ResourceStore, {
        [TEMPLATE_VARIABLE.templateConfig]: templatePath,
        'urn:solid-server:default:variable:baseUrl': baseUrl,
      });
    expect(configStorage.get(identifier.path)).toEqual({ [TEMPLATE_VARIABLE.templateConfig]: templatePath });
  });

  it('rejects identifiers that already have a config.', async(): Promise<void> => {
    await configStorage.set(identifier.path, {});
    await expect(generator.generate(settings)).rejects.toThrow(ConflictHttpError);
  });

  it('rejects invalid config template names.', async(): Promise<void> => {
    settings.template = '../../secret-file.json';
    await expect(generator.generate(settings)).rejects.toThrow(BadRequestHttpError);
  });

  it('only stores relevant variables from an agent object.', async(): Promise<void> => {
    settings[TEMPLATE_VARIABLE.rootFilePath] = 'correctFilePath';
    settings.login = 'should not be stored';
    await expect(generator.generate(settings)).resolves.toBe('store');
    expect(configStorage.get(identifier.path)).toEqual({
      [TEMPLATE_VARIABLE.templateConfig]: templatePath,
      [TEMPLATE_VARIABLE.rootFilePath]: 'correctFilePath',
    });
  });

  it('uses a default template folder if none is provided.', async(): Promise<void> => {
    generator = new TemplatedPodGenerator(storeFactory, variableHandler, configStorage, baseUrl);
    const defaultPath = joinFilePath(__dirname, '../../../../templates/config/', template);

    await expect(generator.generate(settings)).resolves.toBe('store');
    expect(storeFactory.generate)
      .toHaveBeenLastCalledWith(defaultPath, TEMPLATE.ResourceStore, {
        [TEMPLATE_VARIABLE.templateConfig]: defaultPath,
        'urn:solid-server:default:variable:baseUrl': baseUrl,
      });
  });
});
