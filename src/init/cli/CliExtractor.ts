import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import type { CliArgv, Settings } from '../variables/Types';

/**
 * Converts the input CLI arguments into an easily parseable key/value object.
 *
 * Due to how the application is built, there are certain CLI parameters
 * that need to be parsed before this class can be instantiated.
 * These can be ignored by this class as they will have been handled before it is called,
 * but that does mean that this class should not error if they are present,
 * e.g., by being strict throwing an error on these unexpected parameters.
 *
 * The following core CLI parameters are mandatory:
 *  - -c / \--config
 *  - -m / \--mainModulePath
 *  - -l / \--loggingLevel
 */
export abstract class CliExtractor extends AsyncHandler<CliArgv, Settings> {}
