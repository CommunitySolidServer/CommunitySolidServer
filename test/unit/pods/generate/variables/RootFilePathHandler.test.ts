import fs from 'node:fs';
import { RootFilePathHandler } from '../../../../../src/pods/generate/variables/RootFilePathHandler';
import { TEMPLATE_VARIABLE } from '../../../../../src/pods/generate/variables/Variables';
import type { PodSettings } from '../../../../../src/pods/settings/PodSettings';
import type { ResourceLink } from '../../../../../src/storage/mapping/FileIdentifierMapper';
import { ConflictHttpError } from '../../../../../src/util/errors/ConflictHttpError';
import { joinFilePath } from '../../../../../src/util/PathUtil';

jest.mock('node:fs');

describe('A RootFilePathHandler', (): void => {
  const rootFilePath = 'files/';
  const baseUrl = 'http://test.com/';
  let handler: RootFilePathHandler;
  const identifier = { path: 'http://test.com/alice/' };
  let settings: PodSettings;
  let fsPromises: Record<string, jest.Mock>;

  beforeEach(async(): Promise<void> => {
    settings = {} as any;

    handler = new RootFilePathHandler({
      mapUrlToFilePath: async(id): Promise<ResourceLink> => ({
        identifier: id,
        filePath: joinFilePath(rootFilePath, id.path.slice(baseUrl.length)),
        isMetadata: false,
      }),
      mapFilePathToUrl: jest.fn(),
    });

    fs.promises = {
      access: jest.fn(),
    } as any;
    fsPromises = fs.promises as any;
  });

  it('errors if the target folder already exists.', async(): Promise<void> => {
    await expect(handler.handle({ identifier, settings })).rejects.toThrow(ConflictHttpError);
  });

  it('adds the new file path as variable.', async(): Promise<void> => {
    fsPromises.access.mockRejectedValue({ code: 'ENOENT', syscall: 'access' });
    await expect(handler.handle({ identifier, settings })).resolves.toBeUndefined();
    expect(settings[TEMPLATE_VARIABLE.rootFilePath]).toBe(joinFilePath(rootFilePath, 'alice/'));
  });
});
