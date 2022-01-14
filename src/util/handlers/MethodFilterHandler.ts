import { NotImplementedHttpError } from '../errors/NotImplementedHttpError';
import { AsyncHandler } from './AsyncHandler';

/**
 * Only accepts requests where the input has a `method` field that matches any one of the given methods.
 * In case of a match, the input will be sent to the source handler.
 */
export class MethodFilterHandler<TIn extends { method: string }, TOut> extends AsyncHandler<TIn, TOut> {
  private readonly methods: string[];
  private readonly source: AsyncHandler<TIn, TOut>;

  public constructor(methods: string[], source: AsyncHandler<TIn, TOut>) {
    super();
    this.methods = methods;
    this.source = source;
  }

  public async canHandle(input: TIn): Promise<void> {
    if (!this.methods.includes(input.method)) {
      throw new NotImplementedHttpError(
        `Cannot determine permissions of ${input.method}, only ${this.methods.join(',')}.`,
      );
    }
    await this.source.canHandle(input);
  }

  public async handle(input: TIn): Promise<TOut> {
    return this.source.handle(input);
  }
}
