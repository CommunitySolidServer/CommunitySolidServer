import { setGlobalLoggerFactory } from '../../src/logging/LogUtil';
import { VoidLoggerFactory } from '../../src/logging/VoidLoggerFactory';

setGlobalLoggerFactory(new VoidLoggerFactory());
