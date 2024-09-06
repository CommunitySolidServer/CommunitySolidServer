import { SOLID_ERROR } from '../Vocabularies';
import type { HttpErrorOptions } from './HttpError';
import { generateHttpErrorClass } from './HttpError';

// eslint-disable-next-line ts/naming-convention
const BaseHttpError = generateHttpErrorClass(405, 'MethodNotAllowedHttpError');

/**
 * An error thrown when data was found for the requested identifier, but is not supported by the target resource.
 * Can keep track of the methods that are not allowed.
 */
export class MethodNotAllowedHttpError extends BaseHttpError {
  // Components.js can't parse `readonly`
  // eslint-disable-next-line ts/array-type
  public readonly methods: Readonly<string[]>;

  public constructor(methods: string[] = [], message?: string, options?: HttpErrorOptions) {
    super(message ?? `${methods.join(', ')} ${methods.length === 1 ? 'is' : 'are'} not allowed.`, options);
    // Can not override `generateMetadata` as `this.methods` is not defined yet
    for (const method of methods) {
      this.metadata.add(SOLID_ERROR.terms.disallowedMethod, method);
    }
    this.methods = methods;
  }
}
