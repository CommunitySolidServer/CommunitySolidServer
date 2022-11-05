import fs from 'fs';
import * as path from 'path';
import { QueryEngine } from '@comunica/query-sparql';
import fsExtra, { readJSON } from 'fs-extra';
import type { App } from '../../../src';
import { AppRunner } from '../../../src';

describe('An app initialised using configuration in package.json', (): void => {
  let app: App;
  let engine: QueryEngine;
  let files: Record<string, any>;

  const config = {
    port: 3101,
    loggingLevel: 'error',
  };

  const packageJSONbase = {
    name: 'test',
    version: '0.0.0',
    private: true,
  };

  const packageJSON = {
    ...packageJSONbase,
    config: {
      'community-solid-server': config,
    },
  };

  beforeEach(async(): Promise<void> => {
    // Pretend the process is being run from the current folder with the specified set of files available
    jest.spyOn(process, 'cwd').mockReturnValue(__dirname);
    jest.spyOn(fsExtra, 'readJSON').mockImplementation(async(pth: string): Promise<any> => files[pth] ?? readJSON(pth));
    jest.spyOn(fs, 'existsSync').mockImplementation(
      (pth: fs.PathLike): boolean => typeof pth === 'string' && pth in files,
    );

    // Mock .community-solid-server.config.js if it is required
    jest.mock(
      path.join(__dirname, '.community-solid-server.config.js'),
      (): any => files[path.join(__dirname, '.community-solid-server.config.js')],
      { virtual: true },
    );

    // Start up the server
    app = await new AppRunner().createCli([]);
    await app.start();

    // Create a new query engine for test usage
    engine = new QueryEngine();
  });

  afterEach(async(): Promise<void> => {
    await app.stop();
  });

  describe('no package.json or .community-solid-server-config.json is provided', (): void => {
    beforeAll((): void => {
      files = {};
    });

    it('should have created the CSS with the default configuration', async(): Promise<void> => {
      const result = await engine.queryBoolean(
        'ASK { <http://localhost:3000/> a <http://www.w3.org/ns/pim/space#Storage> }', {
          sources: [ 'http://localhost:3000' ],
        },
      );

      expect(result).toBeTruthy();
    });
  });

  describe('package.json with no config', (): void => {
    beforeAll((): void => {
      files = { [path.join(__dirname, 'package.json')]: packageJSONbase };
    });

    it('should have created the CSS with the default configuration', async(): Promise<void> => {
      const result = await engine.queryBoolean(
        'ASK { <http://localhost:3000/> a <http://www.w3.org/ns/pim/space#Storage> }', {
          sources: [ 'http://localhost:3000' ],
        },
      );

      expect(result).toBeTruthy();
    });
  });

  describe('.community-solid-server-config.json but with no package.json', (): void => {
    beforeAll((): void => {
      files = { [path.join(__dirname, '.community-solid-server.config.json')]: config };
    });

    it('should have created the CSS with the default configuration', async(): Promise<void> => {
      const result = await engine.queryBoolean(
        'ASK { <http://localhost:3000/> a <http://www.w3.org/ns/pim/space#Storage> }', {
          sources: [ 'http://localhost:3000' ],
        },
      );

      expect(result).toBeTruthy();
    });
  });

  describe('package.json with config', (): void => {
    beforeAll((): void => {
      files = { [path.join(__dirname, 'package.json')]: packageJSON };
    });

    it('should have created the CSS with the specified configuration', async(): Promise<void> => {
      const result = await engine.queryBoolean(
        'ASK { <http://localhost:3101/> a <http://www.w3.org/ns/pim/space#Storage> }', {
          sources: [ 'http://localhost:3101' ],
        },
      );

      expect(result).toBeTruthy();
    });
  });

  describe('package.json with no config and with .community-solid-server-config.json', (): void => {
    beforeAll((): void => {
      files = {
        [path.join(__dirname, 'package.json')]: packageJSONbase,
        [path.join(__dirname, '.community-solid-server.config.json')]: config,
      };
    });

    it('should have created the CSS with the specified configuration', async(): Promise<void> => {
      const result = await engine.queryBoolean(
        'ASK { <http://localhost:3101/> a <http://www.w3.org/ns/pim/space#Storage> }', {
          sources: [ 'http://localhost:3101' ],
        },
      );

      expect(result).toBeTruthy();
    });
  });

  describe('package.json with no config and with .community-solid-server-config.js', (): void => {
    beforeAll((): void => {
      files = {
        [path.join(__dirname, 'package.json')]: packageJSONbase,
        [path.join(__dirname, '.community-solid-server.config.js')]: `module.exports = ${JSON.stringify(config)}`,
      };
    });

    it('should have created the CSS with the specified configuration', async(): Promise<void> => {
      const result = await engine.queryBoolean(
        'ASK { <http://localhost:3101/> a <http://www.w3.org/ns/pim/space#Storage> }', {
          sources: [ 'http://localhost:3101' ],
        },
      );

      expect(result).toBeTruthy();
    });
  });
});
