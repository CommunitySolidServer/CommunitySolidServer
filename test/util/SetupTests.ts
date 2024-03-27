import { setGlobalLoggerFactory } from '../../src/logging/LogUtil';
import { WinstonLoggerFactory } from '../../src/logging/WinstonLoggerFactory';
import { getTestFolder, removeFolder } from '../integration/Config';

// Jest global setup requires a single function to be exported
export default async function(): Promise<void> {
// Set the main logger
  const level = process.env.LOGLEVEL ?? 'off';
  const loggerFactory = new WinstonLoggerFactory(level);
  setGlobalLoggerFactory(loggerFactory);

  // Also set the logger factory of transpiled JS modules
  // (which are instantiated by Components.js)
  try {
    // eslint-disable-next-line global-require,ts/no-var-requires,ts/no-require-imports
    const dist = require('../../dist/logging/LogUtil');
    dist.setGlobalLoggerFactory(loggerFactory);
  } catch {
    // Ignore
  }

  // Clean up the test folder to prevent issues with remaining files from previous tests
  await removeFolder(getTestFolder(''));
}
