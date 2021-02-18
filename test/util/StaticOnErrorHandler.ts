import { OnErrorHandler } from '../../src/util/handlers/OnErrorHandler';

/**
 * A static helper class for an OnErrorHandler that
 * simply returns the error it is given.
 */
export class StaticOnErrorHandler extends OnErrorHandler<any, any> {
  private readonly canHandleStatic: boolean;

  public constructor(canHandleStatic: boolean) {
    super();
    this.canHandleStatic = canHandleStatic;
  }

  public async canHandle(): Promise<void> {
    if (this.canHandleStatic) {
      return;
    }
    throw new Error('Not supported');
  }

  public async handle(input: { error: unknown; input: any }): Promise<any> {
    return input.error;
  }
}
