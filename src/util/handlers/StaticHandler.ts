import { AsyncHandler } from './AsyncHandler';

/**
 * A handler that always resolves and always returns the stored value.
 * Will return undefined if no value is stored.
 *
 * The generic type extends `any` due to Components.js requirements.
 */
export class StaticHandler<T = void> extends AsyncHandler<unknown, T> {
  private readonly value?: T;

  public constructor(value?: T) {
    super();
    this.value = value;
  }

  public async handle(): Promise<T> {
    return this.value!;
  }
}
