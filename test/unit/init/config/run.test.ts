// This is required since eslint is referring to the local package.json
// eslint-disable-next-line import/no-extraneous-dependencies
import { QueryEngine } from '@comunica/query-sparql';
import type { App } from '../../../../src';
import { AppRunner } from '../../../../src';

describe('An app initialised using configuration in .community-solid-server.config.json', (): void => {
  let app: App;
  let engine: QueryEngine;

  beforeEach(async(): Promise<void> => {
    // Pretend the process is being run from the current folder where the package.json is adjacent
    const spy = jest.spyOn(process, 'cwd');
    spy.mockReturnValue(__dirname);

    // Start up the server
    app = await new AppRunner().createCli([]);
    await app.start();

    // Create a new query engine for test usage
    engine = new QueryEngine();
  });

  afterEach(async(): Promise<void> => {
    await app.stop();
  });

  it('should fetch the root storage from the port specified in the config', async(): Promise<void> => {
    const result = await engine.queryBoolean(
      'ASK { <http://localhost:3101/> a <http://www.w3.org/ns/pim/space#Storage> }', {
        sources: [ 'http://localhost:3101' ],
      },
    );

    expect(result).toBeTruthy();
  });
});
