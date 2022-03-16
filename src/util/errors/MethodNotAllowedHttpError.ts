import { DataFactory } from 'n3';
import type { Quad, Quad_Subject } from 'rdf-js';
import { toNamedTerm, toObjectTerm } from '../TermUtil';
import { SOLID_ERROR } from '../Vocabularies';
import type { HttpErrorOptions } from './HttpError';
import { generateHttpErrorClass } from './HttpError';
import quad = DataFactory.quad;

// eslint-disable-next-line @typescript-eslint/naming-convention
const BaseHttpError = generateHttpErrorClass(405, 'MethodNotAllowedHttpError');

/**
 * An error thrown when data was found for the requested identifier, but is not supported by the target resource.
 * Can keep track of the methods that are not allowed.
 */
export class MethodNotAllowedHttpError extends BaseHttpError {
  public readonly methods: Readonly<string[]>;

  public constructor(methods: string[] = [], message?: string, options?: HttpErrorOptions) {
    super(message ?? `${methods.join(', ')} ${methods.length === 1 ? 'is' : 'are'} not allowed.`, options);
    this.methods = methods;
  }

  public generateMetadata(subject: Quad_Subject | string): Quad[] {
    const term = toNamedTerm(subject);
    const quads = super.generateMetadata(term);
    for (const method of this.methods) {
      quads.push(quad(term, SOLID_ERROR.terms.disallowedMethod, toObjectTerm(method, true)));
    }
    return quads;
  }
}
