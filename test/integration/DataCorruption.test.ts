import fetch from 'cross-fetch';
import { outputFile, pathExists, remove } from 'fs-extra';
import { joinFilePath } from '../../src/util/PathUtil';
import { getPort } from '../util/Util';
import type { App } from '../../src/init/App';
import {
  getDefaultVariables,
  getTestConfigPath,
  getTestFolder,
  instantiateFromConfig,
  removeFolder,
} from './Config';

const port = getPort('DataCorruption');
const baseUrl = `http://localhost:${port}/`;
const rootFilePath = getTestFolder('data-corruption');

async function createTurtleResource(resourceUrl: string, body = '<#a> <#b> <#c> .'): Promise<Response> {
  return fetch(resourceUrl, {
    method: 'PUT',
    headers: {
      'content-type': 'text/turtle',
      'if-none-match': '*',
    },
    body,
  });
}

async function createDanglingMetadata(metaFile: string): Promise<void> {
  await outputFile(metaFile, '<> <http://purl.org/dc/terms/title> "corruption test" .\n');
  await expect(pathExists(metaFile)).resolves.toBe(true);
}

describe('A server with a file backend and a missing body file', (): void => {
  const resourceUrl = `${baseUrl}test`;
  const bodyFile = joinFilePath(rootFilePath, 'test$.ttl');
  const metaFile = joinFilePath(rootFilePath, 'test.meta');

  let app: App;

  beforeAll(async(): Promise<void> => {
    const variables = {
      ...getDefaultVariables(port, baseUrl),
      'urn:solid-server:default:variable:rootFilePath': rootFilePath,
    };

    ({ app } = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      getTestConfigPath('server-file.json'),
      variables,
    ) as Record<string, any>);

    await app.start();
  });

  beforeEach(async(): Promise<void> => {
    await createTurtleResource(resourceUrl);
  });

  afterEach(async(): Promise<void> => {
    // Remove any auxiliary file left behind by a test
    await remove(metaFile);
  });

  afterAll(async(): Promise<void> => {
    await removeFolder(rootFilePath);
    await app.stop();
  });

  describe('when the body file is missing and there is no metadata', (): void => {
    beforeEach(async(): Promise<void> => {
      await remove(bodyFile);
    });

    it('returns 404 on DELETE and allows recreation.', async(): Promise<void> => {
      const deleteRes = await fetch(resourceUrl, { method: 'DELETE' });
      expect(deleteRes.status).toBe(404);

      const recreateRes = await createTurtleResource(resourceUrl, '<#a> <#b> <#d> .');
      expect(recreateRes.status).toBe(201);
      await expect(pathExists(bodyFile)).resolves.toBe(true);
    });
  });

  describe('when only the metadata file remains', (): void => {
    beforeEach(async(): Promise<void> => {
      await createDanglingMetadata(metaFile);
      await remove(bodyFile);
    });

    it('returns 404 on GET.', async(): Promise<void> => {
      const response = await fetch(resourceUrl);
      expect(response.status).toBe(404);
      await expect(pathExists(metaFile)).resolves.toBe(false);
    });

    it('returns 404 on DELETE.', async(): Promise<void> => {
      const response = await fetch(resourceUrl, { method: 'DELETE' });
      expect(response.status).toBe(404);
      await expect(pathExists(metaFile)).resolves.toBe(false);
    });

    it('allows recreation.', async(): Promise<void> => {
      const response = await createTurtleResource(resourceUrl, '<#a> <#b> <#d> .');
      expect(response.status).toBe(201);
      await expect(pathExists(bodyFile)).resolves.toBe(true);
    });
  });
});
