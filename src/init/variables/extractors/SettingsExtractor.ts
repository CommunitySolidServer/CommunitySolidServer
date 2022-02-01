import { AsyncHandler } from '../../../util/handlers/AsyncHandler';
import type { Settings } from '../Types';

/**
 * A handler that computes a specific value from a given map of values.
 */
export abstract class SettingsExtractor extends AsyncHandler<Settings, unknown> {}
