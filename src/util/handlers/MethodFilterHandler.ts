import { NotImplementedHttpError } from '../errors/NotImplementedHttpError';
import { AsyncHandler } from './AsyncHandler';

// The formats from which we can detect the method
type InType = { method: string } | { request: { method: string }} | { operation: { method: string }};

/**
 * Only accepts requests where the input has a (possibly nested) `method` field
 * that matches any one of the given methods.
 * In case of a match, the input will be sent to the source handler.
 */
export class MethodFilterHandler<TIn extends InType, TOut> extends AsyncHandler<TIn, TOut> {
  private readonly methods: string[];
  private readonly source: AsyncHandler<TIn, TOut>;

  public constructor(methods: string[], source: AsyncHandler<TIn, TOut>) {
    super();
    this.methods = methods;
    this.source = source;
  }

  public async canHandle(input: TIn): Promise<void> {
    const method = this.findMethod(input);
    if (!this.methods.includes(method)) {
      throw new NotImplementedHttpError(
        `Cannot determine permissions of ${method}, only ${this.methods.join(',')}.`,
      );
    }
    await this.source.canHandle(input);
  }

  public async handle(input: TIn): Promise<TOut> {
    return this.source.handle(input);
  }

  /**
   * Finds the correct method in the input object.
   */
  private findMethod(input: InType): string {
    if ('method' in input) {
      return input.method;
    }
    if ('request' in input) {
      return this.findMethod(input.request);
    }
    if ('operation' in input) {
      return this.findMethod(input.operation);
    }
    throw new NotImplementedHttpError('Could not find method in input object.');
  }
}
