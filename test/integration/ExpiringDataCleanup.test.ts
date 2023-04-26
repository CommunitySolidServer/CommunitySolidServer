import fetch from 'cross-fetch';
import type { App } from '../../src/init/App';
import { getPort } from '../util/Util';
import {
  getDefaultVariables,
  getTestConfigPath,
  instantiateFromConfig,
} from './Config';

// These `doNotFake` settings are necessary to make sure the server still works
jest.useFakeTimers({ doNotFake: [ 'nextTick' ]});

const port = getPort('ExpiringDataCleanup');
const baseUrl = `http://localhost:${port}/`;

describe('A server with expiring storage', (): void => {
  let app: App;

  beforeAll(async(): Promise<void> => {
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      getTestConfigPath('server-memory.json'),
      getDefaultVariables(port, baseUrl),
    ) as Record<string, any>;
    ({ app } = instances);
    await app.start();
  });

  afterAll(async(): Promise<void> => {
    await app.stop();
  });

  it('does not crash after the interval timeout.', async(): Promise<void> => {
    // Default timeout is 1 hour
    // This test would fail if something goes wrong in an interval timer
    jest.advanceTimersByTime(2 * 60 * 60 * 1000);
    const res = await fetch(baseUrl, { method: 'HEAD' });
    expect(res.status).toBe(200);
  });
});
