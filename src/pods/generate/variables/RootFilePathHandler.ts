import { promises as fsPromises } from 'node:fs';
import type { ResourceIdentifier } from '../../../http/representation/ResourceIdentifier';
import type { FileIdentifierMapper } from '../../../storage/mapping/FileIdentifierMapper';
import { ConflictHttpError } from '../../../util/errors/ConflictHttpError';
import { isSystemError } from '../../../util/errors/SystemError';
import type { PodSettings } from '../../settings/PodSettings';
import { VariableHandler } from './VariableHandler';
import { TEMPLATE_VARIABLE } from './Variables';

/**
 * Uses a FileIdentifierMapper to generate a root file path variable based on the identifier.
 * Will throw an error if the resulting file path already exists.
 */
export class RootFilePathHandler extends VariableHandler {
  private readonly fileMapper: FileIdentifierMapper;

  public constructor(fileMapper: FileIdentifierMapper) {
    super();
    this.fileMapper = fileMapper;
  }

  public async handle({ identifier, settings }: { identifier: ResourceIdentifier; settings: PodSettings }):
  Promise<void> {
    const path = (await this.fileMapper.mapUrlToFilePath(identifier, false)).filePath;
    try {
      // Even though we check if it already exists, there is still a potential race condition
      // in between this check and the store being created.
      await fsPromises.access(path);
      throw new ConflictHttpError(`There already is a folder that corresponds to ${identifier.path}`);
    } catch (error: unknown) {
      if (!(isSystemError(error) && error.code === 'ENOENT')) {
        throw error;
      }
      settings[TEMPLATE_VARIABLE.rootFilePath] = path;
    }
  }
}
