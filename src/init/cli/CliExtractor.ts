import { AsyncHandler } from '../../util/handlers/AsyncHandler';

/**
 * Converts the input CLI arguments into an easily parseable key/value object.
 *
 * There are certain CLI parameters that are required before this class can be instantiated.
 * These can be ignored by this class, but that does mean that this class should not error if they are present.
 *
 * Those CLI parameters are specifically:
 *  - -c / \--config
 *  - -m / \--mainModulePath
 *  - -l / \--loggingLevel
 */
export abstract class CliExtractor extends AsyncHandler<string[], Record<string, unknown>> {}
