import { AsyncHandler } from '../../../util/handlers/AsyncHandler';

/**
 * Renders given options
 */
export abstract class TemplateRenderer<T> extends AsyncHandler<T, string> {}
