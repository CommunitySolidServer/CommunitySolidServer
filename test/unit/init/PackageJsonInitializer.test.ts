// This is required since eslint is referring to the local package.json
// eslint-disable-next-line import/no-extraneous-dependencies
import { QueryEngine } from '@comunica/query-sparql';
import type { App } from '../../../src';
import { AppRunner } from '../../../src';
import fsExtra from 'fs-extra';
import fs from 'fs';
import * as path from 'path';

describe('An app initialised using configuration in package.json', (): void => {
  let app: App;
  let engine: QueryEngine;
  let files: Record<string, any>;

  const config = {
    port: 3101,
    loggingLevel: "error"
  }

  const packageJSONbase = {
    name: "test",
    version: "0.0.0",
    private: true,
  }

  const packageJSON = {
    ...packageJSONbase,
    config: {
      "community-solid-server": config
    }
  }

  beforeEach(async (): Promise<void> => {
    // Pretend the process is being run from the current folder with the specified set of files available
    jest.spyOn(process, 'cwd').mockReturnValue(__dirname);
    jest.spyOn(fsExtra, 'readJSON').mockImplementation(async (pth: string) => files[pth] ?? fsExtra.readJSON(pth));
    jest.spyOn(fs, 'existsSync').mockImplementation((pth: fs.PathLike) => typeof pth === 'string' && pth in files);

    // Start up the server
    app = await new AppRunner().createCli([]);
    await app.start();

    // Create a new query engine for test usage
    engine = new QueryEngine();
  });

  afterEach(async (): Promise<void> => {
    await app.stop();
  });

  describe('no package.json or .community-solid-server-config.json is provided', () => {
    beforeAll(() => {
      files = {};
    });

    it('should have created the CSS with the default configuration', async () => {
      const result = await engine.queryBoolean(
        'ASK { <http://localhost:3000/> a <http://www.w3.org/ns/pim/space#Storage> }', {
        sources: ['http://localhost:3000'],
      },
      );

      expect(result).toBeTruthy();
    })
  });

  describe('package.json with no config', () => {
    beforeAll(() => {
      files = { [path.join(__dirname, 'package.json')]: packageJSONbase };
    });

    it('should have created the CSS with the default configuration', async () => {
      const result = await engine.queryBoolean(
        'ASK { <http://localhost:3000/> a <http://www.w3.org/ns/pim/space#Storage> }', {
        sources: ['http://localhost:3000'],
      },
      );

      expect(result).toBeTruthy();
    })
  });

  describe('.community-solid-server-config.json but with no package.json', () => {
    beforeAll(() => {
      files = { [path.join(__dirname, '.community-solid-server.config.json')]: config };
    });

    it('should have created the CSS with the default configuration', async () => {
      const result = await engine.queryBoolean(
        'ASK { <http://localhost:3000/> a <http://www.w3.org/ns/pim/space#Storage> }', {
        sources: ['http://localhost:3000'],
      },
      );

      expect(result).toBeTruthy();
    })
  });

  describe('package.json with config', () => {
    beforeAll(() => {
      files = { [path.join(__dirname, 'package.json')]: packageJSON };
    });

    it('should have created the CSS with the specified configuration', async () => {
      const result = await engine.queryBoolean(
        'ASK { <http://localhost:3101/> a <http://www.w3.org/ns/pim/space#Storage> }', {
        sources: ['http://localhost:3101'],
      },
      );

      expect(result).toBeTruthy();
    })
  });

  describe('package.json with no config and with with .community-solid-server-config.json', () => {
    beforeAll(() => {
      files = {
        [path.join(__dirname, 'package.json')]: packageJSONbase,
        [path.join(__dirname, '.community-solid-server.config.json')]: config,
      };
    });

    it('should have created the CSS with the specified configuration', async () => {
      const result = await engine.queryBoolean(
        'ASK { <http://localhost:3101/> a <http://www.w3.org/ns/pim/space#Storage> }', {
        sources: ['http://localhost:3101'],
      },
      );

      expect(result).toBeTruthy();
    })
  });
});
