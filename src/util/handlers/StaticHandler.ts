import { AsyncHandler } from './AsyncHandler';

/**
 * A handler that always resolves and always returns the stored value.
 * Will return undefined if no value is stored.
 *
 * The generic type extends `any` due to Components.js requirements.
 */
// eslint-disable-next-line ts/no-unnecessary-type-constraint
export class StaticHandler<T extends any = void> extends AsyncHandler<any, T> {
  private readonly value?: T;

  public constructor(value?: T) {
    super();
    this.value = value;
  }

  public async handle(): Promise<T> {
    // eslint-disable-next-line ts/no-unnecessary-type-assertion
    return this.value!;
  }
}
