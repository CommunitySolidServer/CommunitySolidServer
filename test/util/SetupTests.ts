import { setGlobalLoggerFactory } from '../../src/logging/LogUtil';
import { WinstonLoggerFactory } from '../../src/logging/WinstonLoggerFactory';

// Set the main logger
const level = process.env.LOGLEVEL ?? 'off';
const loggerFactory = new WinstonLoggerFactory(level);
setGlobalLoggerFactory(loggerFactory);

// Also set the logger factory of transpiled JS modules
// (which are instantiated by Components.js)
try {
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const dist = require('../../dist/logging/LogUtil');
  dist.setGlobalLoggerFactory(loggerFactory);
} catch {
  // Ignore
}
