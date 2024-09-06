import { NotImplementedHttpError } from '../errors/NotImplementedHttpError';
import { AsyncHandler } from './AsyncHandler';

/**
 * Handler that does not support any input and will always throw an error.
 */
export class UnsupportedAsyncHandler extends AsyncHandler<unknown, never> {
  private readonly errorMessage?: string;

  public constructor(errorMessage?: string) {
    super();
    this.errorMessage = errorMessage;
  }

  public async canHandle(): Promise<never> {
    throw new NotImplementedHttpError(this.errorMessage);
  }

  public async handle(): Promise<never> {
    return this.canHandle();
  }
}
